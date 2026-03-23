import { readFile, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";

import { renderTemplate } from "./render-template.js";

export async function renderTemplateFile(templateEngine, templateFilePath, contextData = {}, options = {}) {
	if (!templateEngine || !templateEngine.options) {
		throw new TypeError("A valid template engine instance is required.");
	}

	if (!templateFilePath || typeof templateFilePath !== "string") {
		throw new TypeError("Template file path must be a non-empty string.");
	}

	const templateRootDirectoryPath = resolve(templateEngine.options.templateRootDirectoryPath || ".");
	const resolvedTemplateFilePath = resolve(templateRootDirectoryPath, templateFilePath);
	if (
		resolvedTemplateFilePath !== templateRootDirectoryPath &&
		!resolvedTemplateFilePath.startsWith(`${templateRootDirectoryPath}${sep}`)
	) {
		throw new Error("Template path resolves outside template root directory.");
	}

	let templateString = null;
	const enableTemplateFileCache =
		options.enableTemplateFileCache ?? templateEngine.options.enableTemplateFileCache ?? false;
	if (enableTemplateFileCache) {
		const fileStat = await stat(resolvedTemplateFilePath);
		const cachedTemplateFile = templateEngine.templateFileCacheByPath.get(resolvedTemplateFilePath);
		if (
			cachedTemplateFile &&
			cachedTemplateFile.lastModifiedMilliseconds === fileStat.mtimeMs
		) {
			templateString = cachedTemplateFile.templateSource;
		} else {
			templateString = await readFile(resolvedTemplateFilePath, "utf8");
			templateEngine.templateFileCacheByPath.set(resolvedTemplateFilePath, {
				lastModifiedMilliseconds: fileStat.mtimeMs,
				templateSource: templateString
			});
		}
	} else {
		templateString = await readFile(resolvedTemplateFilePath, "utf8");
	}

	return renderTemplate(templateEngine, templateString, contextData, {
		...options,
		templateFilePath: resolvedTemplateFilePath
	});
}
