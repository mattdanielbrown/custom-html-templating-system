import { resolve, sep } from "node:path";

function resolveWithinRoot(rootDirectoryPath, targetPath) {
	const resolvedRootDirectoryPath = resolve(rootDirectoryPath);
	const resolvedTargetPath = resolve(resolvedRootDirectoryPath, targetPath);
	if (
		resolvedTargetPath !== resolvedRootDirectoryPath &&
		!resolvedTargetPath.startsWith(`${resolvedRootDirectoryPath}${sep}`)
	) {
		throw new Error("Function template path resolves outside allowed root.");
	}

	return resolvedTargetPath;
}

export function resolveFunctionTemplatePath(templateEngine, functionTemplatePath) {
	if (!templateEngine || !templateEngine.options) {
		throw new TypeError("A valid template engine instance is required.");
	}

	if (!functionTemplatePath || typeof functionTemplatePath !== "string") {
		throw new TypeError("Function template path must be a non-empty string.");
	}

	const templateRootDirectoryPath = templateEngine.options.templateRootDirectoryPath || ".";
	const functionsDirectoryPath =
		templateEngine.options.functionsDirectoryPath || `${templateRootDirectoryPath}/functions`;

	return resolveWithinRoot(functionsDirectoryPath, functionTemplatePath);
}

export function invokeFunctionTemplate() {
	throw new Error(
		"Function template execution is not implemented yet. See templating-engine-specification.md function-template execution notes."
	);
}
