import type { OutputChannel } from "vscode";
import { Provider } from "../definition-provider.js";
import template from "./hint.hbs";
import type { WordsApiModel, WordsAPIResponse } from "./models.js";

export class WordsApiProvider extends Provider<WordsApiModel> {
  constructor({
    log,
    wordsApiKey,
    storagePath,
  }: {
    log: OutputChannel;
    wordsApiKey: string;
    storagePath: string | undefined;
  }) {
    const requestInit = {
      headers: {
        "x-rapidapi-key": wordsApiKey,
        "x-rapidapi-host": "wordsapiv1.p.rapidapi.com",
      },
    };
    super({
      id: "words-api",
      log,
      storagePath,
      hintTemplate: template,
      toRequest: (word) =>
        new Request(
          `https://wordsapiv1.p.rapidapi.com/words/${encodeURIComponent(word)}`,
          requestInit,
        ),
      toModel: async (response) => {
        const model = (await response.json()) as WordsAPIResponse;

        if (!Array.isArray(model.results)) return null;

        const mapped: WordsApiModel = {
          word: model.word,
          partOfSpeech: {},
        };
        for (const result of model.results) {
          const pos = (mapped.partOfSpeech[result.partOfSpeech] ??= []);
          pos.push({
            definition: result.definition,
            examples: result.examples,
            synonyms: result.synonyms,
            antonyms: result.antonyms,
          });
        }

        return mapped;
      },
    });
  }
}
