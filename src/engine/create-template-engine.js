export function createTemplateEngine(options = {}) {
	const templateEngine = {
		options: {
			templateRootDirectoryPath: options.templateRootDirectoryPath,
			partialsDirectoryPath: options.partialsDirectoryPath,
			functionsDirectoryPath: options.functionsDirectoryPath,
			strictMissingKeyErrors: options.strictMissingKeyErrors ?? false,
			allowRawOutput: options.allowRawOutput ?? true,
			enableTemplateParseCache: options.enableTemplateParseCache ?? false,
			enableTemplateFileCache: options.enableTemplateFileCache ?? false,
			maxFunctionTemplateDepth: options.maxFunctionTemplateDepth ?? 25
		},
		partialsByName: new Map(),
		helpersByName: new Map(),
		templateParseCacheBySource: new Map(),
		templateFileCacheByPath: new Map()
	};

	return templateEngine;
}
