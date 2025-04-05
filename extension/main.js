async function activate(context) {
  const { default: fetch } = await import("node-fetch");
  const vscode = require("vscode");

  const noHover = [];

  /** @type {Map<string, vscode.Hover | null>} */
  const definitionCache = new Map();

  function getWordAroundCursor(document, position) {
    let lineText = document.lineAt(position).text,
      pos = position.character;
    let beforeText = lineText.slice(0, pos),
      afterText = lineText.slice(pos);
    beforeText = (beforeText.match(/\w*$/) || [""])[0];
    afterText = (afterText.match(/^\w*/) || [""])[0];
    return beforeText + afterText;
  }

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
    let definition = definitionCache.get(word);
    if (definition === null) return noHover; // Cached miss

    if (!definition) {
      try {
        const abort = new AbortController();
        cancel.onCancellationRequested(() => abort.abort());
        const response = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
          { signal: abort.signal }
        );
        const data = await response.json();

        if (!Array.isArray(data)) {
          // No match for word
          definitionCache.set(word, null);
          return noHover;
        }

        definition = data[0];
        definitionCache.set(word, definition);
        if (word !== definition.word)
          definitionCache.set(definition.word, definition);
      } catch (err) {
        if (cancel.isCancellationRequested) return noHover;
        return new vscode.Hover([`**Error looking up ${word}**`, "" + err]);
      }
    }

    return new vscode.Hover([
      `**${definition.word}**`,
      "```json\n" + JSON.stringify(definition, null, 2) + "\n```",
    ]);
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
