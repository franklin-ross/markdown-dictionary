/** @type {import('./definition-cache.js').DefinitionCache>} */
let definitionCache;
/** @type {import('./free-dictionary-client.js').FreeDictionaryClient>} */
let dictionaryClient;

/**
 *
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
  const [
    { join },
    { DefinitionCache },
    { FreeDictionaryClient },
    { loadHintTemplate },
  ] = await Promise.all([
    import("node:path"),
    import("./definition-cache.js"),
    import("./free-dictionary-client.js"),
    import("./template.js"),
  ]);
  const vscode = require("vscode");
  const log = vscode.window.createOutputChannel("markdown-dictionary");

  if (vscode.env.appHost === "desktop") {
    const cachePath = join(
      context.globalStoragePath,
      "dictionary-cache.ndjson"
    );
    definitionCache = await DefinitionCache.load(cachePath, log);
  } else {
    definitionCache = new DefinitionCache({ log });
  }

  dictionaryClient = new FreeDictionaryClient({ log });

  const hintTemplate = await loadHintTemplate();

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
      definitions = await dictionaryClient.get(word, cancel);

      if (definitions) {
        definitionCache.set(word, definitions);
        if (word !== definitions[0].word)
          definitionCache.set(definitions[0].word, definitions);
      }
    }

    if (!definitions) return noHover;
    const md = new vscode.MarkdownString(
      definitions
        .map((definition) => hintTemplate({ ...definition, hoverWord: word }))
        .join("\n\n")
    );
    md.supportHtml = true;
    return new vscode.Hover(md);
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
  await definitionCache.save();
  definitionCache = undefined;
  dictionaryClient = undefined;
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
