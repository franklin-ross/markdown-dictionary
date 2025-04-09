import type { OutputChannel } from "vscode";
import { Provider } from "../definition-provider.js";
import template from "./hint.hbs";
import type { WordsAPIResponse } from "./models.js";

export class WordsApiProvider extends Provider<WordsAPIResponse> {
  constructor({
    log,
    wordsApiKey,
    storagePath,
  }: {
    log: OutputChannel;
    wordsApiKey: string;
    storagePath: string | undefined;
  }) {
    const requestInit = { headers: { "X-Mashape-Key": wordsApiKey } };
    super({
      id: "words-api",
      log,
      storagePath,
      hintTemplate: template,
      toRequest: (word) =>
        new Request(
          `https://wordsapiv1.p.mashape.com/words/${encodeURIComponent(word)}`,
          requestInit,
        ),
      toModel: async (response) => response.json() as Promise<WordsAPIResponse>,
    });
  }
}
