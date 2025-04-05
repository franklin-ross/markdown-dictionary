async function activate(context) {
  const [{ default: Handlebars }, { readFile }, { join }] = await Promise.all([
    import("handlebars"),
    import("node:fs/promises"),
    import("node:path"),
  ]);
  let definitionTemplate = Handlebars.compile(
    await readFile(join(__dirname, "definition.hbs"), "utf8")
  );

  console.log(definitionTemplate(definition));
}

void activate();
