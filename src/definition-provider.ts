import type { TemplateDelegate } from "handlebars";
import { join } from "path/posix";
import * as vscode from "vscode";
import { DefinitionApiClient } from "./definition-api-client";
import { DefinitionCache } from "./definition-cache";

export interface ProviderOpts<TModel extends object> {
  id: string;
  log: vscode.OutputChannel;
  client: DefinitionApiClient<TModel>;
  cache: DefinitionCache<TModel>;
  hintTemplate: TemplateDelegate<TModel>;
}

export interface StandardProviderOpts<TModel extends object> {
  id: string;
  log: vscode.OutputChannel;
  toRequest: (word: string) => string | URL | Request;
  toModel: (response: Response) => Promise<TModel | null | undefined>;
  hintTemplate: TemplateDelegate<TModel>;
  storagePath: string | undefined;
}

export interface HintProvider {
  /**
   * Find a definition for the given word and format it for display as a hover
   * hint in VSCode.
   * @param word The word to look up. Case is ignored.
   * @param cancel Cancel the request.
   * @returns A promise that resolves to the definition of the word as a hover,
   * or `null` if the word is not known.
   */
  hint(
    word: string,
    cancel: vscode.CancellationToken,
  ): Promise<vscode.Hover | null | undefined>;
}

export class Provider<TModel extends object>
  implements AsyncDisposable, HintProvider
{
  readonly id: string;
  private log: vscode.OutputChannel;
  private client: DefinitionApiClient<TModel>;
  private cache: DefinitionCache<TModel>;
  private hintTemplate: TemplateDelegate<TModel>;

  constructor(opts: StandardProviderOpts<TModel> | ProviderOpts<TModel>) {
    this.id = opts.id;
    this.log = opts.log;
    this.hintTemplate = opts.hintTemplate;
    if ("client" in opts) {
      this.client = opts.client;
      this.cache = opts.cache;
    } else {
      this.client = new DefinitionApiClient<TModel>({
        log: opts.log,
        toRequest: opts.toRequest,
        toModel: opts.toModel,
      });
      this.cache = new DefinitionCache<TModel>({
        log: opts.log,
        cachePath: opts.storagePath
          ? join(opts.storagePath, `${opts.id}.cache.ndjson`)
          : undefined,
      });

      if (opts.storagePath) {
        this.log.appendLine(
          `${opts.id}: Syncing cache from ${this.cache.cachePath}`,
        );
        // Refresh the cache from the file system in the background
        void this.cache
          .refresh()
          .catch((error) =>
            this.log.appendLine(
              `${opts.id}: Error refreshing cache from ${this.cache.cachePath}: ${error}`,
            ),
          );
      } else {
        this.log.appendLine(`${opts.id}: definition cache not available`);
      }
    }
  }

  /**
   * Find a definition for the given word and format it for display as a hover
   * hint in VSCode.
   * @param word The word to look up. Case is ignored.
   * @param cancel Cancel the request.
   * @returns A promise that resolves to the definition of the word as a hover,
   * or `null` if the word is not known.
   */
  async hint(
    word: string,
    _cancel: vscode.CancellationToken,
  ): Promise<vscode.Hover | null | undefined> {
    const normalWord = word.toLowerCase();
    let definition = this.cache.get(normalWord);

    // null means we cached a miss for this word
    if (definition === undefined) {
      // I'm intentionally not passing the cancellation token here. Cancellation
      // happens at the slightest mouse move even if you're still on the same
      // word. Chances are we're most of the way through the request anyway and
      // have already paid the cost.
      definition = await this.client.get(normalWord);

      if (definition !== undefined) {
        // Cache values and nulls, which represent a concrete miss
        this.cache.set(normalWord, definition);
      }
    }

    if (!definition) {
      this.log.appendLine(`${this.id}: No hint available for "${word}"`);
      return null;
    }

    const md = new vscode.MarkdownString(this.hintTemplate(definition));
    (md as unknown as { supportHtml: boolean }).supportHtml = true;
    this.log.appendLine(`${this.id}: Providing hint for "${word}"`);
    return new vscode.Hover(md);
  }

  async [Symbol.asyncDispose](): Promise<void> {
    this.log.appendLine("WordsApiProvider: Shutting down");
    await this.cache.save();
    this.client = undefined as any;
    this.cache = undefined as any;
    this.hintTemplate = undefined as any;
    this.log.appendLine("WordsApiProvider: Shutdown complete");
    this.log = undefined as any;
  }
}
