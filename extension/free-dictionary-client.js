exports.FreeDictionaryClient = class FreeDictionaryClient {
  /** @type {import('vscode').OutputChannel} */
  log;
  /** @type {typeof fetch} */
  fetch;

  /**
   * @param {Object} options
   * @param {import('vscode').OutputChannel} options.log
   * @param {undefined | typeof fetch} options.fetch
   */
  constructor({ log, fetch }) {
    this.log = log;
    this.fetch =
      fetch ??
      (async (...args) => {
        const { default: fetch } = await import("node-fetch");
        this.fetch = fetch;
        return this.fetch(...args);
      });
  }

  /**
   * Get the definition of a word from the free dictionary API.
   * @param {string} word
   * @param {import('vscode').CancellationToken | AbortSignal} cancel
   * @returns {Promise<import('./free-dictionary-api').DictionaryEntry[] | null>}
   */
  async get(word, cancel) {
    const abort = toAbort(cancel);
    if (abort.aborted) return null;

    try {
      const response = await this.fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
        { signal: abort.signal }
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
};

/**
 * @param {import('vscode').CancellationToken | AbortSignal} cancel
 * @returns {AbortSignal}
 */
function toAbort(cancel) {
  if (cancel instanceof AbortSignal) return cancel;
  const abort = new AbortController();
  cancel.onCancellationRequested(() => abort.abort());
  return abort.signal;
}
