import { type CancellationToken, type OutputChannel } from "vscode";

export interface DictionaryApi {
  /**
   * Get the definition of a word from the free dictionary API.
   * @param word The word to look up.
   * @param cancel The
   * cancellation token or abort signal to cancel the request.
   */
  get(
    word: string,
    cancel: AbortSignal | CancellationToken
  ): Promise<DictionaryEntry[] | null>;
}

/**
 * Represents a phonetic transcription and optional audio for a word.
 */
export interface Phonetic {
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
export interface Definition {
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
export interface Meaning {
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
export interface DictionaryEntry {
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

export class FreeDictionaryClient implements DictionaryApi {
  private log: OutputChannel;
  private fetch: typeof globalThis.fetch;

  constructor({
    log,
    fetch,
  }: {
    log: OutputChannel;
    fetch?: undefined | typeof globalThis.fetch;
  }) {
    this.log = log;
    this.fetch =
      fetch ??
      (async (...args: Parameters<typeof globalThis.fetch>) => {
        const { default: fetch } = await import("node-fetch");
        this.fetch = fetch as unknown as typeof globalThis.fetch;
        return this.fetch(...args);
      });
  }

  /**
   * Get the definition of a word from the free dictionary API.
   */
  async get(
    word: string,
    cancel: CancellationToken | AbortSignal
  ): Promise<DictionaryEntry[] | null> {
    const abort = toAbort(cancel);
    if (abort.aborted) return null;

    try {
      const response = await this.fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
        { signal: abort }
      );
      if (abort.aborted) return null;
      if (!response.ok) {
        this.log.appendLine(
          `HTTP error ${response.status} looking up ${word}: ${response.statusText}`
        );

        return null;
      }

      const definitions = await response.json();

      if (
        abort.aborted ||
        !Array.isArray(definitions) ||
        definitions.length === 0
      ) {
        return null;
      }

      return definitions;
    } catch (err) {
      if (!abort.aborted)
        this.log.appendLine(`Error looking up ${word}: ${err}`);
      return null;
    }
  }
}

function toAbort(cancel: CancellationToken | AbortSignal): AbortSignal {
  if (cancel instanceof AbortSignal) return cancel;
  const abort = new AbortController();
  cancel.onCancellationRequested(() => abort.abort());
  return abort.signal;
}
