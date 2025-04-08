import * as ndjson from "ndjson";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { type OutputChannel } from "vscode";
import { type DictionaryEntry } from "./free-dictionary-client";

export class DefinitionCache {
  cachePath: undefined | string;
  log: undefined | OutputChannel;
  /** Whether there are changes since the last save. */
  dirty = false;
  cache: Map<string, DictionaryEntry[] | null>;

  constructor({
    cache = new Map<string, DictionaryEntry[] | null>(),
    cachePath,
    log,
  }: {
    cache?: Map<string, DictionaryEntry[] | null>;
    cachePath?: undefined | string;
    log?: undefined | OutputChannel;
  } = {}) {
    this.cachePath = cachePath;
    this.cache = cache;
    this.log = log;
  }

  get(key: string): DictionaryEntry[] | null | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: DictionaryEntry[] | null): void {
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
    if (this.cachePath) await rm(this.cachePath, { force: true });
  }

  /** Refresh the in-memory dictionary cache from disk in case there are new
   * entries. */
  async refresh() {
    if (!this.cachePath) return;
    try {
      await refresh(this.cachePath, this.cache);
    } catch (error) {
      if ((error as { code: string }).code !== "ENOENT")
        this.log?.appendLine(
          "Error refreshing dictionary from cache: " + error
        );
    }
  }

  /**
   * Syncs these dictionary entries with those cached on disk.
   * @returns {Promise<void>}
   */
  async save(): Promise<void> {
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
   * @param {null | OutputChannel} log
   * @returns {Promise<DefinitionCache>}
   */
  static async load(
    cachePath: string,
    log?: undefined | OutputChannel
  ): Promise<DefinitionCache> {
    try {
      const cache = await load(cachePath);
      log?.appendLine(
        `Loaded ${cache.size} entries from dictionary cache at ${cachePath}`
      );
      return new DefinitionCache({ cache, cachePath, log });
    } catch (error) {
      if ((error as { code: string }).code !== "ENOENT")
        log?.appendLine("Error loading dictionary cache: " + error);
      return new DefinitionCache({ cachePath, log });
    }
  }
}

/**
 * Load a Map<string, unknown> from a newline delimited JSON file of entries.
 */
export async function load(
  path: string
): Promise<Map<string, DictionaryEntry[] | null>> {
  return await pipeline(
    createReadStream(path),
    ndjson.parse(),
    async function (source: AsyncIterable<[string, DictionaryEntry[] | null]>) {
      const dictionary = new Map<string, DictionaryEntry[] | null>();
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
 * @param dictionary Load cached data into this
 * dictionary where the entries don't already exist.
 * @param path The cache file path to load.
 */
export async function refresh(
  path: string,
  dictionary: Map<string, DictionaryEntry[] | null>
): Promise<void> {
  await pipeline(
    createReadStream(path),
    ndjson.parse(),
    async function (source: AsyncIterable<[string, DictionaryEntry[] | null]>) {
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
 * @param path The file path to save.
 * @param dictionary The dictionary
 * entries to save. This could be a Map.
 * @returns {Promise<void>}
 */
export async function save(
  path: string | URL,
  dictionary: Iterable<[key: string, entry: unknown]>
): Promise<void> {
  await pipeline(
    Readable.from(dictionary),
    ndjson.stringify(),
    createWriteStream(path)
  );
}
