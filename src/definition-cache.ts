import * as ndjson from "ndjson";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { type OutputChannel } from "vscode";

type Alias = { $alias: string };

const fmtMs = new Intl.NumberFormat(undefined, {
  style: "unit",
  unit: "millisecond",
  unitDisplay: "short", // or 'long' or 'narrow'
});

const formatKb = new Intl.NumberFormat(undefined, {
  style: "unit",
  unit: "kilobyte",
  unitDisplay: "short",
});

export class DefinitionCache<DefinitionType extends object> {
  cachePath: undefined | string;
  log: undefined | OutputChannel;
  /** Whether there are changes since the last save. */
  dirty = false;
  cache: Map<string, DefinitionType | Alias | null>;

  constructor({
    cache = new Map<string, DefinitionType | Alias | null>(),
    cachePath,
    log,
  }: {
    /** The in memory cache of dictionary entries. */
    cache?: Map<string, DefinitionType | Alias | null>;
    /** The path to the dictionary cache file when saving or refreshing from
     * disk. */
    cachePath?: undefined | string;
    /** The output channel to log to. */
    log?: undefined | OutputChannel;
  } = {}) {
    this.cachePath = cachePath;
    this.cache = cache;
    this.log = log;
  }

  get(word: string): DefinitionType | null | undefined {
    const entry = this.cache.get(word);
    if (!entry) return entry;
    if ("$alias" in entry) return this.get(entry.$alias);
    return entry;
  }

  set(word: string, value: DefinitionType | null): void {
    this.cache.set(word, value);
    this.dirty = true;
  }

  alias(word: string, alias: string): void {
    this.cache.set(word, { $alias: alias });
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
      const start = performance.now();
      const newCount = await refresh(this.cachePath, this.cache);
      const timeTaken = performance.now() - start;
      const { size } = await stat(this.cachePath);
      this.log?.appendLine(
        `Loaded ${newCount} new entries from disk (${formatKb.format(size / 1024)}) in ${fmtMs.format(timeTaken)}`,
      );
    } catch (error) {
      if ((error as { code: string }).code !== "ENOENT")
        this.log?.appendLine(
          `DefinitionCache: Error refreshing from ${this.cachePath}: ${error}`,
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
        const start = performance.now();
        await save(this.cachePath, this.cache);
        this.dirty = false;
        const timeTaken = performance.now() - start;
        const { size } = await stat(this.cachePath);
        this.dirty = false;
        this.log?.appendLine(
          `Saved ${this.cache.size} entries (${formatKb.format(size / 1024)}) to dictionary cache in ${fmtMs.format(timeTaken)}`,
        );
      } catch (error) {
        this.log?.appendLine("DefinitionCache: Save error: " + error);
      }
    }
  }

  /**
   * Loads a dictionary from the given cache path.
   * @param {string | URL} cachePath
   * @param {null | OutputChannel} log
   * @returns {Promise<DefinitionCache>}
   */
  static async load<DefinitionType extends object>(
    cachePath: string,
    log?: undefined | OutputChannel,
  ): Promise<DefinitionCache<DefinitionType>> {
    try {
      const start = performance.now();
      const cache = await load<DefinitionType>(cachePath);
      const timeTaken = performance.now() - start;
      const { size } = await stat(cachePath);
      log?.appendLine(
        `Loaded ${cache.size} entries from disk (${formatKb.format(size / 1024)}) in ${fmtMs.format(timeTaken)}`,
      );
      return new DefinitionCache<DefinitionType>({ cache, cachePath, log });
    } catch (error) {
      if ((error as { code: string }).code !== "ENOENT")
        log?.appendLine("DefinitionCache: Load error: " + error);
      return new DefinitionCache<DefinitionType>({ cachePath, log });
    }
  }
}

/**
 * Load a Map<string, unknown> from a newline delimited JSON file of entries.
 */
export async function load<DefinitionType extends object>(
  path: string,
): Promise<Map<string, DefinitionType | Alias | null>> {
  return await pipeline(
    createReadStream(path),
    ndjson.parse(),
    async function (
      source: AsyncIterable<[string, DefinitionType | Alias | null]>,
    ) {
      const dictionary = new Map<string, DefinitionType | Alias | null>();
      for await (const [key, value] of source) {
        dictionary.set(key, value);
      }
      return dictionary;
    },
  );
}

/**
 * Load new data into a Map<string, unknown> from a newline delimited JSON file
 * of entries.
 * @param dictionary Load cached data into this
 * dictionary where the entries don't already exist.
 * @param path The cache file path to load.
 * @returns {Promise<number>} The number of new entries loaded into the cache.
 */
export async function refresh<DefinitionType extends object>(
  path: string,
  dictionary: Map<string, DefinitionType | Alias | null>,
): Promise<number> {
  return await pipeline(
    createReadStream(path),
    ndjson.parse(),
    async function (
      source: AsyncIterable<[string, DefinitionType | Alias | null]>,
    ) {
      let count = 0;
      for await (const [key, value] of source) {
        if (!dictionary.has(key)) {
          dictionary.set(key, value);
          count++;
        }
      }
      return count;
    },
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
  dictionary: Iterable<[key: string, entry: unknown]>,
): Promise<void> {
  await pipeline(
    Readable.from(dictionary),
    ndjson.stringify(),
    createWriteStream(path),
  );
}
