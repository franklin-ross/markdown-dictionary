/**
 * Represents the top-level structure of the JSON response from the WordsAPI for a single word.
 */
export interface WordsAPIResponse {
  /**
   * The word that was queried.
   */
  word: string;
  /**
   * An array of results, each representing a different meaning or aspect of the word.
   */
  results?: Result[];
  /**
   * Information about the syllables of the word.
   */
  syllables?: Syllables;
  /**
   * Information about the pronunciation of the word.
   */
  pronunciation?: Pronunciation;
  /**
   * A numerical value indicating the frequency of the word's usage.
   */
  frequency?: number;
}

/**
 * Represents a single result for a word, including its definition, part of speech, and related words.
 */
export interface Result {
  /**
   * The definition of the word in this context.
   */
  definition?: string;
  /**
   * The part of speech of the word (e.g., noun, verb, adjective).
   */
  partOfSpeech?: string;
  /**
   * An array of synonyms for the word in this context.
   */
  synonyms?: string[];
  /**
   * An array of words that are a broader category of the current word.
   */
  typeOf?: string[];
  /**
   * An array of words that are specific types or instances of the current word.
   */
  hasTypes?: string[];
  /**
   * An array of words from which the current word is derived.
   */
  derivation?: string[];
  /**
   * An array of example sentences using the word in this context.
   */
  examples?: string[];
}

/**
 * Represents information about the syllables of a word.
 */
export interface Syllables {
  /**
   * The number of syllables in the word.
   */
  count?: number;
  /**
   * An array containing each syllable of the word.
   */
  list?: string[];
}

/**
 * Represents information about the pronunciation of a word.
 */
export interface Pronunciation {
  /**
   * A phonetic representation of the word's pronunciation (often in IPA).
   */
  all?: string;
  // You might encounter other pronunciation formats in the API,
  // you can add them here as needed, for example:
  // arpabet?: string;
}
