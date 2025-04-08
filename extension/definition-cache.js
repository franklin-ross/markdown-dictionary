const { mkdir, rm } = require("node:fs/promises");
const { createReadStream, createWriteStream } = require("node:fs");
const { dirname } = require("node:path");
const ndjson = require("ndjson");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");

class DefinitionCache {
  /** @type {null | string | URL} */
  cachePath;
  /** @type {null | import('vscode').OutputChannel} */
  log;
  /** Whether there are changes since the last save. */
  dirty = false;

  constructor({ cache = new Map(), cachePath = null, log = null } = {}) {
    this.cachePath = cachePath;
    this.cache = cache;
    this.log = log;
  }

  /**
   * @param {string} key
   * @returns {import('./free-dictionary-api').DictionaryEntry[] | null}
   */
  get(key) {
    return this.cache.get(key);
  }

  /**
   * @param {string} key
   * @param {import('./free-dictionary-api').DictionaryEntry[] | null} value
   * @returns {void}
   */
  set(key, value) {
    this.cache.set(key, value);
    this.dirty = true;
  }

  /** Clear all dictionary entries in this cache. */
  clear() {
    this.cache.clear();
    this.dirty = true;
  }

  /** Remove the dictionary cache file from disk. */
  async clearCache() {
    await rm(this.cachePath, { force: true });
  }

  /** Refresh the in-memory dictionary cache from disk in case there are new
   * entries. */
  async refresh() {
    if (!this.cachePath) return;
    try {
      await refresh(this.cachePath, this.cache);
    } catch (error) {
      if (error.code !== "ENOENT")
        this.log?.appendLine(
          "Error refreshing dictionary from cache: " + error
        );
    }
  }

  /**
   * Syncs these dictionary entries with those cached on disk.
   * @returns {Promise<void>}
   */
  async save() {
    if (this.cachePath && this.cache.size > 0 && this.dirty) {
      await this.refresh();

      try {
        await mkdir(dirname(this.cachePath), { recursive: true });
        await save(this.cachePath, this.cache);
        this.dirty = false;
        this.log?.appendLine(
          `Saved ${this.cache.size} entries to dictionary cache at ${this.cachePath}`
        );
      } catch (error) {
        this.log?.appendLine("Error saving dictionary cache: " + error);
      }
    }
  }

  /**
   * Loads a dictionary from the given cache path.
   * @param {string | URL} cachePath
   * @param {null | import('vscode').OutputChannel} log
   * @returns {Promise<DefinitionCache>}
   */
  static async load(cachePath, log) {
    try {
      const cache = await load(cachePath);
      log?.appendLine(
        `Loaded ${cache.size} entries from dictionary cache at ${cachePath}`
      );
      return new DefinitionCache({ cache, cachePath, log });
    } catch (error) {
      if (error.code !== "ENOENT")
        log?.appendLine("Error loading dictionary cache: " + error);
      return new DefinitionCache({ cachePath, log });
    }
  }
}

/**
 * Load a Map<string, unknown> from a newline delimited JSON file of entries.
 * @param {string | URL} path The file path to load.
 * @returns {Promise<Map<string, unknown>>}
 */
async function load(path) {
  return await pipeline(
    createReadStream(path),
    ndjson.parse(),
    async function (source) {
      /** @type {Map<string, unknown>} */
      const dictionary = new Map();
      for await (const [key, value] of source) {
        dictionary.set(key, value);
      }
      return dictionary;
    }
  );
}

/**
 * Load new data into a Map<string, unknown> from a newline delimited JSON file
 * of entries.
 * @param {Map<string, unknown>} dictionary Load cached data into this
 * dictionary where the entries don't already exist.
 * @param {string | URL} path The cache file path to load.
 * @returns {Promise<void>}
 */
async function refresh(dictionary, path) {
  await pipeline(
    createReadStream(path),
    ndjson.parse(),
    async function (source) {
      for await (const [key, value] of source) {
        if (!dictionary.has(key)) {
          dictionary.set(key, value);
        }
      }
    }
  );
}

/**
 * Create or replace a newline delimited JSON file of entries.
 * @param {string | URL} path The file path to save.
 * @param {Iterable<[key: string, entry: unknown]>} dictionary The dictionary
 * entries to save. This could be a Map.
 * @returns {Promise<void>}
 */
async function save(path, dictionary) {
  await pipeline(
    Readable.from(dictionary),
    ndjson.stringify(),
    createWriteStream(path)
  );
}

exports.refresh = refresh;
exports.save = save;
exports.load = load;
exports.DefinitionCache = DefinitionCache;
