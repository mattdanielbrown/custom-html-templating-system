export function createTemplateEngine(options = {}) {
	const templateEngine = {
		options: {
			templateRootDirectoryPath: options.templateRootDirectoryPath,
			partialsDirectoryPath: options.partialsDirectoryPath,
			strictMissingKeyErrors: options.strictMissingKeyErrors ?? false,
			allowRawOutput: options.allowRawOutput ?? true,
			enableTemplateParseCache: options.enableTemplateParseCache ?? false,
			enableTemplateFileCache: options.enableTemplateFileCache ?? false
		},
		partialsByName: new Map(),
		helpersByName: new Map(),
		templateParseCacheBySource: new Map(),
		templateFileCacheByPath: new Map()
	};

	return templateEngine;
}
