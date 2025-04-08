declare module "*.hbs" {
  import type handlebars from "handlebars";
  const template: handlebars.TemplateDelegate;
  export default template;
}
