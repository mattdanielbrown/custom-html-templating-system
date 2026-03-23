import { readFileSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";

function isObjectLike(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

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

function readFunctionTemplateSource(templateEngine, resolvedFunctionTemplatePath, runtimeContext) {
	const useFileCache = runtimeContext.settings.enableTemplateFileCache;
	if (useFileCache) {
		const fileStat = statSync(resolvedFunctionTemplatePath);
		const cachedTemplateFile = templateEngine.templateFileCacheByPath.get(resolvedFunctionTemplatePath);
		if (
			cachedTemplateFile &&
			cachedTemplateFile.lastModifiedMilliseconds === fileStat.mtimeMs
		) {
			return cachedTemplateFile.templateSource;
		}

		const templateSource = readFileSync(resolvedFunctionTemplatePath, "utf8");
		templateEngine.templateFileCacheByPath.set(resolvedFunctionTemplatePath, {
			lastModifiedMilliseconds: fileStat.mtimeMs,
			templateSource
		});
		return templateSource;
	}

	return readFileSync(resolvedFunctionTemplatePath, "utf8");
}

export function invokeFunctionTemplate(templateEngine, functionTemplatePath, argumentObject, runtimeContext) {
	if (!runtimeContext || typeof runtimeContext !== "object") {
		throw new TypeError("Function runtime context is required.");
	}

	if (!isObjectLike(argumentObject)) {
		throw runtimeContext.createFunctionRenderError(
			"Function templates require a single object argument.",
			"TEMPLATE_RENDER_FUNCTION_INVALID_ARGUMENTS"
		);
	}

	let resolvedFunctionTemplatePath = null;
	try {
		resolvedFunctionTemplatePath = resolveFunctionTemplatePath(templateEngine, functionTemplatePath);
	} catch (error) {
		throw runtimeContext.createFunctionRenderError(
			`Function template path '${functionTemplatePath}' resolves outside functions root.`,
			"TEMPLATE_RENDER_FUNCTION_PATH_OUTSIDE_ROOT",
			error
		);
	}

	if (runtimeContext.functionPathStack.includes(resolvedFunctionTemplatePath)) {
		throw runtimeContext.createFunctionRenderError(
			`Function template recursion detected for '${resolvedFunctionTemplatePath}'.`,
			"TEMPLATE_RENDER_FUNCTION_RECURSION"
		);
	}

	const maxFunctionTemplateDepth = runtimeContext.maxFunctionTemplateDepth ?? 25;
	if (runtimeContext.functionPathStack.length >= maxFunctionTemplateDepth) {
		throw runtimeContext.createFunctionRenderError(
			`Function template depth exceeded maximum of ${maxFunctionTemplateDepth}.`,
			"TEMPLATE_RENDER_FUNCTION_RECURSION"
		);
	}

	let functionTemplateSource = null;
	try {
		functionTemplateSource = readFunctionTemplateSource(
			templateEngine,
			resolvedFunctionTemplatePath,
			runtimeContext
		);
	} catch (error) {
		if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
			throw runtimeContext.createFunctionRenderError(
				`Function template not found at '${resolvedFunctionTemplatePath}'.`,
				"TEMPLATE_RENDER_FUNCTION_NOT_FOUND",
				error
			);
		}

		throw runtimeContext.createFunctionRenderError(
			`Function template execution failed while loading '${resolvedFunctionTemplatePath}'.`,
			"TEMPLATE_RENDER_FUNCTION_EXECUTION_FAILED",
			error
		);
	}

	try {
		return runtimeContext.renderFunctionTemplateSource(
			functionTemplateSource,
			resolvedFunctionTemplatePath,
			argumentObject,
			[...runtimeContext.functionPathStack, resolvedFunctionTemplatePath]
		);
	} catch (error) {
		if (error && typeof error === "object" && "errorName" in error) {
			throw error;
		}

		throw runtimeContext.createFunctionRenderError(
			`Function template execution failed for '${resolvedFunctionTemplatePath}'.`,
			"TEMPLATE_RENDER_FUNCTION_EXECUTION_FAILED",
			error
		);
	}
}
