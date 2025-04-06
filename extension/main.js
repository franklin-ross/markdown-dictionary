/** @type {import('vscode').OutputChannel} */
let log;
/** @type {string} */
let cachePath;
/** @type {Map<string, import('./dictionary-api').DictionaryEntry[] | null>} */
let definitionCache = new Map();

/**
 *
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
  const [
    { default: fetch },
    { default: Handlebars },
    { readFile },
    { join },
    definitionDb,
  ] = await Promise.all([
    import("node-fetch"),
    import("handlebars"),
    import("node:fs/promises"),
    import("node:path"),
    import("./definition-db.js"),
  ]);
  const vscode = require("vscode");
  log = vscode.window.createOutputChannel("markdown-dictionary");

  let hintTemplate = Handlebars.compile(
    await readFile(join(__dirname, "hint.hbs"), "utf8")
  );

  if (vscode.env.appHost === "desktop") {
    cachePath = join(context.globalStoragePath, "dictionary-cache.ndjson");

    try {
      definitionCache = await definitionDb.load(cachePath);
      log.appendLine("Loaded dictionary cache from " + cachePath);
    } catch (error) {
      log.appendLine("Failed to load dictionary cache: " + error);
    }
  }

  const noHover = [];

  /**
   * Find a definition for the given word, fetching from the
   * [Dictionary API](https://www.dictionaryapi.dev/) if necessary.
   *
   * @param {string} word The word to look up.
   * @param {import('vscode').CancellationToken} cancel A cancellation token.
   *
   * @returns {Thenable<vscode.Hover | null>} A promise that resolves to the
   * definition of the word as a hover, or `[]` if the word is not known.
   */
  async function findHints(word, cancel) {
    let definitions = definitionCache.get(word);
    if (definitions === null) return noHover; // Cached miss

    if (!definitions) {
      try {
        const abort = new AbortController();
        cancel.onCancellationRequested(() => abort.abort());
        const response = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
          { signal: abort.signal }
        );
        definitions = await response.json();

        if (!Array.isArray(definitions) || definitions.length === 0) {
          // No match for word
          definitionCache.set(word, null);
          return noHover;
        }

        definitionCache.set(word, definitions);
        if (word !== definitions[0].word)
          definitionCache.set(definitions[0].word, definitions);
      } catch (err) {
        if (cancel.isCancellationRequested) return noHover;
        return new vscode.Hover([`**Error looking up ${word}**`, "" + err]);
      }
    }

    return new vscode.Hover(
      definitions
        .map((definition) => hintTemplate({ ...definition, hoverWord: word }))
        .join("\n\n")
    );
  }

  context.subscriptions.push(
    vscode.languages.registerHoverProvider("markdown", {
      provideHover: (document, position, cancel) => {
        const word = getWordAroundCursor(document, position);
        return findHints(word, cancel);
      },
    })
  );
}

/**
 * Sync the dictionary cache to disk on extension deactivation.
 * @param {vscode.ExtensionContext} context
 */
async function deactivate() {
  if (cachePath && definitionCache.size > 0) {
    const [{ mkdir }, { dirname }, definitionDb] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
      import("./definition-db.js"),
    ]);

    try {
      await mkdir(dirname(cachePath), { recursive: true });
    } catch (error) {
      log.appendLine(
        "Failed to create extension global storage path: " + error
      );
    }

    let cacheToStore = definitionCache;

    try {
      cacheToStore = await definitionDb.load(cachePath);
      for (const [key, value] of definitionCache) {
        cacheToStore.set(key, value);
      }
    } catch (error) {
      log.appendLine(
        "Failed to merge dictionary into existing dictionary cache: " + error
      );
    }

    try {
      await definitionDb.save(cachePath, cacheToStore);
      log.appendLine("Saved dictionary cache to " + cachePath);
    } catch (error) {
      log.appendLine("Failed to save dictionary cache: " + error);
    }
  }

  definitionCache.clear();
}

exports.activate = activate;
exports.deactivate = deactivate;

function getWordAroundCursor(document, position) {
  let lineText = document.lineAt(position).text,
    pos = position.character;
  let beforeText = lineText.slice(0, pos),
    afterText = lineText.slice(pos);
  beforeText = (beforeText.match(/\w*$/) || [""])[0];
  afterText = (afterText.match(/^\w*/) || [""])[0];
  return beforeText + afterText;
}
