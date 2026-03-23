export function registerPartial(templateEngine, name, templateStringOrPath) {
	if (!templateEngine || !templateEngine.partialsByName) {
		throw new TypeError("A valid template engine instance is required.");
	}

	if (!name || typeof name !== "string") {
		throw new TypeError("Partial name must be a non-empty string.");
	}

	templateEngine.partialsByName.set(name, templateStringOrPath);
	return templateEngine;
}
