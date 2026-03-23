import { createTemplateEngine } from "./create-template-engine.js";
import { registerPartial } from "./register-partial.js";
import { registerHelper } from "./register-helper.js";
import { renderTemplate } from "./render-template.js";
import { renderTemplateFile } from "./render-template-file.js";

const templateEngineApi = {
	"create-template-engine": (options) => createTemplateEngine(options),
	"render-template": (templateEngine, templateString, contextData, options) =>
		renderTemplate(templateEngine, templateString, contextData, options),
	"render-template-file": (templateEngine, templateFilePath, contextData, options) =>
		renderTemplateFile(templateEngine, templateFilePath, contextData, options),
	"register-partial": (templateEngine, name, templateStringOrPath) =>
		registerPartial(templateEngine, name, templateStringOrPath),
	"register-helper": (templateEngine, name, helperFunction) =>
		registerHelper(templateEngine, name, helperFunction)
};

export {
	createTemplateEngine,
	renderTemplate,
	renderTemplateFile,
	registerPartial,
	registerHelper,
	templateEngineApi
};

export default templateEngineApi;
