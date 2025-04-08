import { type TemplateDelegate } from "handlebars";
import { join } from "node:path";
import * as vscode from "vscode";
import { DefinitionCache } from "../definition-cache.js";
import {
  FreeDictionaryClient,
  type DictionaryEntry,
} from "./free-dictionary-client.js";
import template from "./hint.hbs";

export const hintTemplate: TemplateDelegate<DictionaryEntry> = template;

/**
 * Handles the fetching of dictionary definitions from the [Dictionary
 * API](https://www.dictionaryapi.dev/), caching, and formatting the results for
 * VSCode.
 */
export class FreeDictionaryProvider implements AsyncDisposable {
  private client: FreeDictionaryClient;
  private cache: DefinitionCache<DictionaryEntry[]>;
  private log: vscode.OutputChannel;

  constructor(opts: {
    client: FreeDictionaryClient;
    cache: DefinitionCache<DictionaryEntry[]>;
    log: vscode.OutputChannel;
  }) {
    this.client = opts.client;
    this.cache = opts.cache;
    this.log = opts.log;
  }

  /** Create the standard free dictionary provider. */
  static async create(
    log: vscode.OutputChannel,
    storagePath: string | undefined,
  ): Promise<FreeDictionaryProvider> {
    log.appendLine("FreeDictionaryProvider: Initialising standard provider");

    const client = new FreeDictionaryClient({ log });
    let cache: DefinitionCache<DictionaryEntry[]>;

    if (
      storagePath &&
      (vscode.env as unknown as { appHost: string }).appHost === "desktop"
    ) {
      const cachePath = join(storagePath, "free-dictionary-cache.ndjson");
      log.appendLine(`FreeDictionaryProvider: Syncing cache from ${cachePath}`);
      cache = await DefinitionCache.load<DictionaryEntry[]>(cachePath, log);
    } else {
      log.appendLine(
        "FreeDictionaryProvider: Cache not available " +
          (storagePath
            ? "outside of desktop environment"
            : "because storage path not provided"),
      );
      cache = new DefinitionCache<DictionaryEntry[]>({ log });
    }

    return new FreeDictionaryProvider({ client, cache, log });
  }

  /**
   * Find a definition for the given word and format it for display as a hover
   * hint in VSCode.
   * @param word The word to look up.
   * @param cancel Cancel the request.
   * @returns A promise that resolves to the definition of the word as a hover,
   * or `[]` if the word is not known.
   */
  async hint(
    word: string,
    _cancel: vscode.CancellationToken,
  ): Promise<vscode.Hover | null | undefined> {
    let definitions = this.cache.get(word);

    // null means we cached a miss for this word
    if (definitions === undefined) {
      // I'm intentionally not passing the cancellation token here. Cancellation
      // happens at the slightest mouse move even if you're still on the same
      // word. Chances are we're most of the way through the request anyway and
      // have already paid the cost.
      definitions = await this.client.get(word);

      if (definitions) {
        const definedWord = definitions[0].word;
        this.cache.set(definedWord, definitions);
        if (word !== definedWord) this.cache.alias(word, definedWord);
      }
    }

    if (!definitions) {
      this.log.appendLine(
        "FreeDictionaryProvider: No hint available for " + word,
      );
      return null;
    }

    const md = new vscode.MarkdownString(
      definitions.map((definition) => hintTemplate(definition)).join("\n\n"),
    );
    (md as unknown as { supportHtml: boolean }).supportHtml = true;
    this.log.appendLine("FreeDictionaryProvider: Providing hint for " + word);
    return new vscode.Hover(md);
  }

  async [Symbol.asyncDispose](): Promise<void> {
    this.log.appendLine("FreeDictionaryProvider: Shutting down");
    await this.cache.save();
    this.client = undefined as unknown as FreeDictionaryClient;
    this.cache = undefined as unknown as DefinitionCache<DictionaryEntry[]>;
    this.log.appendLine("FreeDictionaryProvider: Shutdown complete");
  }
}
