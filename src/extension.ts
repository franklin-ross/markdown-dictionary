import { rm } from "node:fs/promises";
import * as vscode from "vscode";
import { ExtensionContext, Position, TextDocument } from "vscode";
import { HintProvider } from "./definition-provider.js";
import { FreeDictionaryProvider } from "./free-dictionary-api/provider.js";
import { WordsApiProvider } from "./words-api/provider.js";

const forCleanup = new Set<AsyncDisposable>();
const log = vscode.window.createOutputChannel("markdown-dictionary");

const providers = new Map<string, HintProvider>();
const isDesktop =
  (vscode.env as unknown as { appHost: string }).appHost === "desktop";

async function activate(context: ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "markdownDictionary.clearCaches",
      async () => {
        try {
          for (const provider of providers.values()) {
            log.appendLine(`Clearing cache for ${provider.id}`);
            await provider.clear();
          }

          const storagePath = isDesktop ? context.globalStoragePath : undefined;
          if (storagePath) {
            log.appendLine(
              `Deleting all files in extension storage path: ${storagePath}`,
            );
            await rm(storagePath, { recursive: true, force: true });
          }

          log.appendLine("Cleared caches");
        } catch (error) {
          log.appendLine("Error clearing caches: " + error);
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.languages.registerHoverProvider("markdown", {
      provideHover: (doc, position, cancel) => {
        const config = vscode.workspace.getConfiguration(
          "markdownDictionary",
          doc.uri,
        );
        const word = getWordAroundCursor(doc, position);

        switch (config.get("provider")) {
          case "words-api":
            return getWordsApiProvider(context, config)?.hint(word, cancel);
          default:
            return getFreeDictionaryProvider(context, config).hint(
              word,
              cancel,
            );
        }
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
  providers.clear();
  log.dispose();
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

function getFreeDictionaryProvider(
  context: ExtensionContext,
  config: vscode.WorkspaceConfiguration,
) {
  const providerKey = "free-dictionary-api";
  let provider = providers.get(providerKey) as FreeDictionaryProvider;
  if (provider) return provider;

  provider = new FreeDictionaryProvider({
    log,
    storagePath: isDesktop ? context.globalStoragePath : undefined,
  });
  providers.set(providerKey, provider);
  forCleanup.add(provider);
  return provider;
}

function getWordsApiProvider(
  context: ExtensionContext,
  config: vscode.WorkspaceConfiguration,
) {
  const wordsApiKey = config.get("wordsApiKey") as string;
  if (!wordsApiKey) {
    log.appendLine(
      "Using 'markdownDictionary.provider: words-api' requires 'markdownDictionary.wordsApiKey' to be set",
    );
    return undefined;
  }

  const providerKey = "words-api+" + wordsApiKey;
  let provider = providers.get(providerKey) as WordsApiProvider;
  if (provider) return provider;

  provider = new WordsApiProvider({
    log,
    storagePath: isDesktop ? context.globalStoragePath : undefined,
    wordsApiKey,
  });
  providers.set(providerKey, provider);
  forCleanup.add(provider);
  return provider;
}
