export function registerHelper(templateEngine, name, helperFunction) {
	if (!templateEngine || !templateEngine.helpersByName) {
		throw new TypeError("A valid template engine instance is required.");
	}

	if (!name || typeof name !== "string") {
		throw new TypeError("Helper name must be a non-empty string.");
	}

	if (typeof helperFunction !== "function") {
		throw new TypeError("Helper must be a function.");
	}

	templateEngine.helpersByName.set(name, helperFunction);
	return templateEngine;
}
