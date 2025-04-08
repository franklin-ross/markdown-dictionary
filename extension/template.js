exports.loadHintTemplate = async () => {
  const [{ default: Handlebars }, { readFile }, { join }] = await Promise.all([
    import("handlebars"),
    import("node:fs/promises"),
    import("node:path"),
  ]);

  return Handlebars.compile(
    await readFile(join(__dirname, "hint.hbs"), "utf8")
  );
};
