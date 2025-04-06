/**
 *
 * @param {string | Buffer | URL | import("node:stream").Readable} pathOrStream
 * @returns {Promise<Map<string, any>>}
 */
exports.load = async function load(pathOrStream) {
  const [{ createReadStream }, { parse }, { Readable }] = await Promise.all([
    import("node:fs"),
    import("ndjson"),
    import("node:stream"),
  ]);

  const readStream =
    pathOrStream instanceof Readable
      ? pathOrStream
      : createReadStream(pathOrStream);

  return await new Promise((resolve, reject) => {
    const dictionary = new Map();
    readStream
      .on("error", reject)
      .pipe(parse())
      .on("data", ([key, entry]) => dictionary.set(key, entry))
      .on("end", () => resolve(dictionary))
      .on("error", reject);
  });
};

/**
 *
 * @param {string | Buffer | URL | import("node:stream").Writable} pathOrStream
 * @param {Iterable<[string, any]>} dictionary
 * @returns
 */
exports.save = async function save(pathOrStream, dictionary) {
  const [{ createWriteStream }, { stringify }, { Writable }] =
    await Promise.all([
      import("node:fs"),
      import("ndjson"),
      import("node:stream"),
    ]);

  const writeStream =
    pathOrStream instanceof Writable
      ? pathOrStream
      : createWriteStream(pathOrStream, { flags: "w" });

  return await new Promise((resolve, reject) => {
    const ndjsonStream = stringify();
    ndjsonStream.pipe(writeStream).on("finish", resolve).on("error", reject);

    for (const entry of dictionary) {
      ndjsonStream.write(entry);
    }

    ndjsonStream.end();
  });
};
