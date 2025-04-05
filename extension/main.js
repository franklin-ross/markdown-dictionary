const path = require("node:path");

async function activate(context) {
  const [{ default: fetch }, { default: Handlebars }, { readFile }, { join }] =
    await Promise.all([
      import("node-fetch"),
      import("handlebars"),
      import("node:fs/promises"),
      import("node:path"),
    ]);
  const vscode = require("vscode");
  let definitionTemplate = Handlebars.compile(
    await readFile(join(__dirname, "definition.hbs"), "utf8")
  );

  const noHover = [];

  /** @type {Map<string, import('./dictionary').DictionaryEntry[] | null>} */
  const definitionCache = new Map();

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
        .map((definition) =>
          definitionTemplate({ ...definition, hoverWord: word })
        )
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

function deactivate() {}

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
