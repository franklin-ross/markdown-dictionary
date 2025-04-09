import { type CancellationToken, type OutputChannel } from "vscode";

export class DefinitionApiClient<TModel> {
  private log: OutputChannel;
  private fetch: typeof globalThis.fetch;
  private toRequest: (word: string) => string | URL | Request;
  private toModel: (data: unknown) => TModel | undefined;

  constructor({
    log,
    toRequest,
    toModel = (data) => data as TModel,
    fetch = globalThis.fetch,
  }: {
    log: OutputChannel;
    /** Convert a word to a request for that definition. */
    toRequest: (word: string) => string | URL | Request;
    /** Map the API result to the model. */
    toModel?: (data: unknown) => TModel;
    /** A custom fetch implementation. */
    fetch?: undefined | typeof globalThis.fetch;
  }) {
    this.log = log;
    this.toRequest = toRequest;
    this.toModel = toModel;
    this.fetch = fetch;
  }

  /**
   * Get the definition of a word from the free dictionary API.
   * @param word The word to look up.
   * @param cancel Cancel the request.
   * @returns A promise that resolves to the definition of the word, `null` if
   * the word definitely doesn't exist in this API, or `undefined` if we
   * couldn't get the word but might be able to later.
   */
  async get(
    word: string,
    cancel?: CancellationToken | AbortSignal,
  ): Promise<TModel | null | undefined> {
    const abort = toAbort(cancel);
    if (abort?.aborted) return undefined;

    try {
      this.log.appendLine(`JsonApiClient: Fetching definition for ${word}`);
      const request = this.toRequest(word);
      const response = await this.fetch(request, { signal: abort });
      if (!response.ok) {
        this.log.appendLine(
          `JsonApiClient: HTTP error ${response.status} looking up ${word}: ${response.statusText}`,
        );

        // If we get a 404, assume that means the word doesn't exist
        return response.status == 404 ? null : undefined;
      }

      const responseModel = await response.json();
      const model = this.toModel(responseModel);
      return model;
    } catch (err) {
      if (!abort?.aborted)
        this.log.appendLine(`JsonApiClient: Error looking up ${word}: ${err}`);
      return undefined;
    }
  }
}

function toAbort(
  cancel?: CancellationToken | AbortSignal,
): undefined | AbortSignal {
  if (!cancel || cancel instanceof AbortSignal) return cancel;
  const abort = new AbortController();
  cancel.onCancellationRequested(() => abort.abort());
  return abort.signal;
}
