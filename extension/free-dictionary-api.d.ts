export interface DictionaryApi {
  /**
   * Get the definition of a word from the free dictionary API.
   * @param {string} word The word to look up.
   * @param {import('vscode').CancellationToken | AbortSignal} cancel The
   * cancellation token or abort signal to cancel the request.
   */
  get(
    word: string,
    cancel: AbortSignal | import("vscode").CancellationToken
  ): Promise<DictionaryEntry | null>;
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
