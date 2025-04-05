const definition = [
  {
    word: "file",
    phonetic: "/faɪl/",
    phonetics: [
      { text: "/faɪl/", audio: "" },
      {
        text: "/faɪl/",
        audio:
          "https://api.dictionaryapi.dev/media/pronunciations/en/file-us.mp3",
        sourceUrl: "https://commons.wikimedia.org/w/index.php?curid=1648242",
        license: {
          name: "BY-SA 3.0",
          url: "https://creativecommons.org/licenses/by-sa/3.0",
        },
      },
    ],
    meanings: [
      {
        partOfSpeech: "noun",
        definitions: [
          {
            definition:
              "A collection of papers collated and archived together.",
            synonyms: [],
            antonyms: [],
          },
          { definition: "A roll or list.", synonyms: [], antonyms: [] },
          {
            definition: "Course of thought; thread of narration.",
            synonyms: [],
            antonyms: [],
          },
          {
            definition:
              "An aggregation of data on a storage device, identified by a name.",
            synonyms: [],
            antonyms: [],
            example:
              "I'm going to delete these unwanted files to free up some disk space.",
          },
        ],
        synonyms: ["document", "paper"],
        antonyms: [],
      },
      {
        partOfSpeech: "verb",
        definitions: [
          {
            definition: "To commit (official papers) to some office.",
            synonyms: [],
            antonyms: [],
          },
          {
            definition: "To place in an archive in a logical place and order",
            synonyms: [],
            antonyms: [],
          },
          {
            definition:
              "To store a file (aggregation of data) on a storage medium such as a disc or another computer.",
            synonyms: [],
            antonyms: [],
          },
          {
            definition: "(with for) To submit a formal request to some office.",
            synonyms: [],
            antonyms: [],
            example: "She filed for divorce the next day.",
          },
          {
            definition: "To set in order; to arrange, or lay away.",
            synonyms: [],
            antonyms: [],
          },
        ],
        synonyms: [],
        antonyms: [],
      },
    ],
    license: {
      name: "CC BY-SA 3.0",
      url: "https://creativecommons.org/licenses/by-sa/3.0",
    },
    sourceUrls: ["https://en.wiktionary.org/wiki/file"],
  },
  {
    word: "file",
    phonetic: "/faɪl/",
    phonetics: [
      { text: "/faɪl/", audio: "" },
      {
        text: "/faɪl/",
        audio:
          "https://api.dictionaryapi.dev/media/pronunciations/en/file-us.mp3",
        sourceUrl: "https://commons.wikimedia.org/w/index.php?curid=1648242",
        license: {
          name: "BY-SA 3.0",
          url: "https://creativecommons.org/licenses/by-sa/3.0",
        },
      },
    ],
    meanings: [
      {
        partOfSpeech: "noun",
        definitions: [
          {
            definition:
              'A column of people one behind another, whether "single file" or in a large group with many files side by side.',
            synonyms: [],
            antonyms: [],
            example: "The troops marched in Indian file.",
          },
          {
            definition: "A small detachment of soldiers.",
            synonyms: [],
            antonyms: [],
          },
          {
            definition:
              "One of the eight vertical lines of squares on a chessboard (i.e., those identified by a letter). The analog horizontal lines are the ranks.",
            synonyms: [],
            antonyms: [],
          },
        ],
        synonyms: [],
        antonyms: [],
      },
      {
        partOfSpeech: "verb",
        definitions: [
          {
            definition: "To move in a file.",
            synonyms: [],
            antonyms: [],
            example:
              "The applicants kept filing into the room until it was full.",
          },
        ],
        synonyms: [],
        antonyms: [],
      },
    ],
    license: {
      name: "CC BY-SA 3.0",
      url: "https://creativecommons.org/licenses/by-sa/3.0",
    },
    sourceUrls: ["https://en.wiktionary.org/wiki/file"],
  },
  {
    word: "file",
    phonetic: "/faɪl/",
    phonetics: [
      { text: "/faɪl/", audio: "" },
      {
        text: "/faɪl/",
        audio:
          "https://api.dictionaryapi.dev/media/pronunciations/en/file-us.mp3",
        sourceUrl: "https://commons.wikimedia.org/w/index.php?curid=1648242",
        license: {
          name: "BY-SA 3.0",
          url: "https://creativecommons.org/licenses/by-sa/3.0",
        },
      },
    ],
    meanings: [
      {
        partOfSpeech: "noun",
        definitions: [
          {
            definition:
              "A hand tool consisting of a handle to which a block of coarse metal is attached, and used for removing sharp edges or for cutting, especially through metal.",
            synonyms: [],
            antonyms: [],
          },
          {
            definition: "A cunning or resourceful person.",
            synonyms: [],
            antonyms: [],
          },
        ],
        synonyms: [],
        antonyms: [],
      },
      {
        partOfSpeech: "verb",
        definitions: [
          {
            definition: "To smooth, grind, or cut with a file.",
            synonyms: [],
            antonyms: [],
            example:
              "I'd better file the bottoms of the table legs. Otherwise they will scratch the flooring.",
          },
        ],
        synonyms: [],
        antonyms: [],
      },
    ],
    license: {
      name: "CC BY-SA 3.0",
      url: "https://creativecommons.org/licenses/by-sa/3.0",
    },
    sourceUrls: ["https://en.wiktionary.org/wiki/file"],
  },
  {
    word: "file",
    phonetic: "/faɪl/",
    phonetics: [
      { text: "/faɪl/", audio: "" },
      {
        text: "/faɪl/",
        audio:
          "https://api.dictionaryapi.dev/media/pronunciations/en/file-us.mp3",
        sourceUrl: "https://commons.wikimedia.org/w/index.php?curid=1648242",
        license: {
          name: "BY-SA 3.0",
          url: "https://creativecommons.org/licenses/by-sa/3.0",
        },
      },
    ],
    meanings: [
      {
        partOfSpeech: "verb",
        definitions: [
          { definition: "To defile", synonyms: [], antonyms: [] },
          { definition: "To corrupt", synonyms: [], antonyms: [] },
        ],
        synonyms: [],
        antonyms: [],
      },
    ],
    license: {
      name: "CC BY-SA 3.0",
      url: "https://creativecommons.org/licenses/by-sa/3.0",
    },
    sourceUrls: ["https://en.wiktionary.org/wiki/file"],
  },
];

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
