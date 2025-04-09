import template from "./hint.hbs";
import { DictionaryEntry } from "./models.js";

import type { OutputChannel } from "vscode";
import { Provider } from "../definition-provider.js";

export class FreeDictionaryProvider extends Provider<DictionaryEntry[]> {
  constructor({
    log,
    storagePath,
  }: {
    log: OutputChannel;
    storagePath: string | undefined;
  }) {
    super({
      id: "free-dictionary",
      log,
      storagePath,
      hintTemplate: template,
      toRequest: (word) =>
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      toModel: async (response) =>
        response.json() as Promise<DictionaryEntry[]>,
    });
  }
}
