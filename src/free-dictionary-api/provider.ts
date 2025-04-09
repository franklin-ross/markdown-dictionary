import { type TemplateDelegate } from "handlebars";
import { join } from "node:path";
import * as vscode from "vscode";
import { DefinitionApiClient } from "../definition-api-client.js";
import { DefinitionCache } from "../definition-cache.js";
import template from "./hint.hbs";

export const hintTemplate: TemplateDelegate<DictionaryEntry[]> = template;

/**
 * Handles the fetching of dictionary definitions from the [Dictionary
 * API](https://www.dictionaryapi.dev/), caching, and formatting the results for
 * VSCode.
 */
export class FreeDictionaryProvider implements AsyncDisposable {
  private client: DefinitionApiClient<DictionaryEntry[]>;
  private cache: DefinitionCache<DictionaryEntry[]>;
  private log: vscode.OutputChannel;

  constructor(opts: {
    client: DefinitionApiClient<DictionaryEntry[]>;
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

    const client = new DefinitionApiClient<DictionaryEntry[]>({
      log,
      toRequest: toFreeDictionaryRequest,
    });
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

      if (definitions === null) {
        // Cache a miss for this word
        this.cache.set(word, null);
      } else if (Array.isArray(definitions) && definitions.length > 0) {
        const definedWord = definitions[0].word;
        this.cache.set(definedWord, definitions);
        if (word !== definedWord) this.cache.alias(word, definedWord);
      }
    }

    if (!definitions) {
      this.log.appendLine(
        `FreeDictionaryProvider: No hint available for "${word}"`,
      );
      return null;
    }

    const md = new vscode.MarkdownString(hintTemplate(definitions));
    (md as unknown as { supportHtml: boolean }).supportHtml = true;
    this.log.appendLine(`FreeDictionaryProvider: Providing hint for "${word}"`);
    return new vscode.Hover(md);
  }

  async [Symbol.asyncDispose](): Promise<void> {
    this.log.appendLine("FreeDictionaryProvider: Shutting down");
    await this.cache.save();
    this.client = undefined as any;
    this.cache = undefined as any;
    this.log.appendLine("FreeDictionaryProvider: Shutdown complete");
  }
}

function toFreeDictionaryRequest(word: string): string | URL | Request {
  return `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
}

/**
 * Represents a phonetic transcription and optional audio for a word.
 */
interface Phonetic {
  /**
   * The phonetic spelling of the word.
   */
  text?: string;
  /**
   * URL to the audio pronunciation of the word.
   */
  audio?: string;
}

/**
 * Represents a single definition of a word.
 */
interface Definition {
  /**
   * The definition of the word.
   */
  definition: string;
  /**
   * An example sentence using the word in the defined sense.
   */
  example?: string;
  /**
   * An array of synonyms for the word in this definition.
   */
  synonyms: string[];
  /**
   * An array of antonyms for the word in this definition.
   */
  antonyms: string[];
}

/**
 * Represents the meanings of a word for a specific part of speech.
 */
interface Meaning {
  /**
   * The part of speech (e.g., "exclamation", "noun", "verb").
   */
  partOfSpeech: string;
  /**
   * An array of definitions for the word under this part of speech.
   */
  definitions: Definition[];
}

/**
 * Represents the complete dictionary entry for a word.
 */
interface DictionaryEntry {
  /**
   * The word itself.
   */
  word: string;
  /**
   * The primary phonetic transcription of the word (optional).
   */
  phonetic?: string;
  /**
   * An array of phonetic transcriptions and optional audio pronunciations (optional).
   */
  phonetics?: Phonetic[];
  /**
   * Information about the origin of the word (optional).
   */
  origin?: string;
  /**
   * An array of meanings for the word, categorized by part of speech.
   */
  meanings: Meaning[];
}
