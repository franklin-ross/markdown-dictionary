import { type TemplateDelegate } from "handlebars";
import { type DictionaryEntry } from "./free-dictionary-client.js";
import template from "./hint.hbs";

export const hintTemplate: TemplateDelegate<DictionaryEntry> = template;
