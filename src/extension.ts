import type { ExtensionContext, Position, TextDocument } from "vscode";
import * as vscode from "vscode";
import { FreeDictionaryProvider } from "./free-dictionary-api/provider.js";

const forCleanup = new Set<AsyncDisposable>();
const log = vscode.window.createOutputChannel("markdown-dictionary");

async function activate(context: ExtensionContext) {
  const isDesktop =
    (vscode.env as unknown as { appHost: string }).appHost === "desktop";

  const hintProvider = new FreeDictionaryProvider({
    log,
    storagePath: isDesktop ? context.globalStoragePath : undefined,
  });
  forCleanup.add(hintProvider);

  context.subscriptions.push(
    vscode.languages.registerHoverProvider("markdown", {
      provideHover: (doc, position, cancel) => {
        const word = getWordAroundCursor(doc, position);
        return hintProvider.hint(word, cancel);
      },
    }),
  );
}

async function deactivate() {
  for (const disposable of forCleanup) {
    try {
      await disposable[Symbol.asyncDispose]();
    } catch (error) {
      console.error("Error disposing extensions:", error);
      log.appendLine("Error disposing extensions: " + error);
    }
  }
  forCleanup.clear();
}

exports.activate = activate;
exports.deactivate = deactivate;

function getWordAroundCursor(doc: TextDocument, position: Position) {
  let lineText = doc.lineAt(position).text,
    pos = position.character;
  let beforeText = lineText.slice(0, pos),
    afterText = lineText.slice(pos);
  beforeText = (beforeText.match(/\w*$/) || [""])[0];
  afterText = (afterText.match(/^\w*/) || [""])[0];
  return beforeText + afterText;
}
