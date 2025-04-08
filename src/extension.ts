import { join } from "node:path";
import type {
  CancellationToken,
  ExtensionContext,
  Hover,
  Position,
  TextDocument,
} from "vscode";
import * as vscode from "vscode";
import { DefinitionCache } from "./definition-cache.js";
import { FreeDictionaryClient } from "./free-dictionary-client.js";
import { hintTemplate } from "./template.js";

let definitionCache: DefinitionCache;
let dictionaryClient: FreeDictionaryClient;

async function activate(context: ExtensionContext) {
  const log = vscode.window.createOutputChannel("markdown-dictionary");

  if ((vscode.env as unknown as { appHost: string }).appHost === "desktop") {
    const cachePath = join(
      context.globalStoragePath,
      "dictionary-cache.ndjson"
    );
    definitionCache = await DefinitionCache.load(cachePath, log);
  } else {
    definitionCache = new DefinitionCache({ log });
  }

  dictionaryClient = new FreeDictionaryClient({ log });

  /**
   * Find a definition for the given word, fetching from the
   * [Dictionary API](https://www.dictionaryapi.dev/) if necessary.
   *
   * @param word The word to look up.
   * @param cancel A cancellation token.
   *
   * @returns A promise that resolves to the
   * definition of the word as a hover, or `[]` if the word is not known.
   */
  async function findHints(
    word: string,
    cancel: CancellationToken
  ): Promise<Hover | null | undefined> {
    let definitions = definitionCache.get(word);
    if (definitions === null) return null;

    if (!definitions) {
      definitions = await dictionaryClient.get(word, cancel);

      if (definitions) {
        definitionCache.set(word, definitions);
        if (word !== definitions[0].word)
          definitionCache.set(definitions[0].word, definitions);
      }
    }

    if (!definitions) return null;
    const md = new vscode.MarkdownString(
      definitions.map((definition) => hintTemplate(definition)).join("\n\n")
    );
    (md as unknown as { supportHtml: boolean }).supportHtml = true;
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
  (definitionCache as unknown as undefined) = undefined;
  (dictionaryClient as unknown as undefined) = undefined;
}

exports.activate = activate;
exports.deactivate = deactivate;

function getWordAroundCursor(document: TextDocument, position: Position) {
  let lineText = document.lineAt(position).text,
    pos = position.character;
  let beforeText = lineText.slice(0, pos),
    afterText = lineText.slice(pos);
  beforeText = (beforeText.match(/\w*$/) || [""])[0];
  afterText = (afterText.match(/^\w*/) || [""])[0];
  return beforeText + afterText;
}
