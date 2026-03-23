import { readFileSync, statSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { invokeFunctionTemplate } from "./function-template-runtime.js";

const RAW_TEMPLATE_OUTPUT_SYMBOL = Symbol("raw-template-output");

function createTemplateError({
	errorName,
	message,
	code,
	templateFilePath,
	line,
	column,
	snippet,
	cause
}) {
	const templateError = new Error(message, cause ? { cause } : undefined);
	templateError.name = errorName;
	templateError.errorName = errorName;
	templateError.code = code;
	templateError.templateFilePath = templateFilePath || null;
	templateError.line = line;
	templateError.column = column;
	templateError.snippet = snippet || null;
	templateError.cause = cause || null;
	return templateError;
}

function getLineAndColumn(templateString, characterIndex) {
	let line = 1;
	let column = 1;

	for (let index = 0; index < characterIndex; index += 1) {
		if (templateString[index] === "\n") {
			line += 1;
			column = 1;
		} else {
			column += 1;
		}
	}

	return { line, column };
}

function createParseError(templateString, templateFilePath, message, code, characterIndex, snippet) {
	const { line, column } = getLineAndColumn(templateString, characterIndex);
	return createTemplateError({
		errorName: "TemplateParseError",
		message,
		code,
		templateFilePath,
		line,
		column,
		snippet,
		cause: null
	});
}

function createRenderError(templateFilePath, message, code, node, cause = null) {
	return createTemplateError({
		errorName: "TemplateRenderError",
		message,
		code,
		templateFilePath,
		line: node?.line || 1,
		column: node?.column || 1,
		snippet: node?.snippet || null,
		cause
	});
}

function isObjectLike(value) {
	return value !== null && typeof value === "object";
}

function isSafeSegment(segment) {
	return segment !== "__proto__" && segment !== "prototype" && segment !== "constructor";
}

function getOwnPropertyValue(value, segment) {
	if (!isObjectLike(value)) {
		return { found: false, value: undefined };
	}

	if (!Object.prototype.hasOwnProperty.call(value, segment)) {
		return { found: false, value: undefined };
	}

	return {
		found: true,
		value: value[segment]
	};
}

function resolvePathInValue(value, pathSegments, node, templateFilePath) {
	let currentValue = value;

	for (const segment of pathSegments) {
		if (!isSafeSegment(segment)) {
			throw createRenderError(
				templateFilePath,
				`Unsafe path segment '${segment}' is not allowed.`,
				"TEMPLATE_RENDER_UNSAFE_PATH_SEGMENT",
				node
			);
		}

		const propertyResult = getOwnPropertyValue(currentValue, segment);
		if (!propertyResult.found) {
			return { found: false, value: undefined };
		}

		currentValue = propertyResult.value;
	}

	return { found: true, value: currentValue };
}

function resolvePath(pathExpression, scopeFrames, node, templateFilePath) {
	const trimmedPathExpression = pathExpression.trim();

	if (!trimmedPathExpression) {
		return { found: false, value: undefined };
	}

	if (trimmedPathExpression === ".") {
		return {
			found: true,
			value: scopeFrames[scopeFrames.length - 1].contextValue
		};
	}

	const pathSegments = trimmedPathExpression
		.split(".")
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0);

	if (pathSegments.length === 0) {
		return { found: false, value: undefined };
	}

	const firstSegment = pathSegments[0];
	const remainingSegments = pathSegments.slice(1);

	for (let index = scopeFrames.length - 1; index >= 0; index -= 1) {
		const scopeFrame = scopeFrames[index];
		const localBindingResult = getOwnPropertyValue(scopeFrame.localBindings, firstSegment);

		if (localBindingResult.found) {
			return resolvePathInValue(localBindingResult.value, remainingSegments, node, templateFilePath);
		}

		const contextResult = resolvePathInValue(scopeFrame.contextValue, pathSegments, node, templateFilePath);
		if (contextResult.found) {
			return contextResult;
		}
	}

	return { found: false, value: undefined };
}

function toOutputString(value) {
	if (value === null || value === undefined) {
		return "";
	}

	return String(value);
}

function createRawTemplateOutputValue(value) {
	return {
		[RAW_TEMPLATE_OUTPUT_SYMBOL]: toOutputString(value)
	};
}

function readRawTemplateOutputValue(value) {
	if (!isObjectLike(value)) {
		return null;
	}

	if (!Object.prototype.hasOwnProperty.call(value, RAW_TEMPLATE_OUTPUT_SYMBOL)) {
		return null;
	}

	return value[RAW_TEMPLATE_OUTPUT_SYMBOL];
}

function escapeHtml(value) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function findOperatorIndex(expression, operator) {
	let quote = null;
	let depth = 0;
	for (let index = 0; index <= expression.length - operator.length; index += 1) {
		const character = expression[index];
		if ((character === '"' || character === "'") && expression[index - 1] !== "\\") {
			quote = quote === character ? null : quote || character;
			continue;
		}

		if (quote) {
			continue;
		}

		if (character === "(" || character === "[" || character === "{") {
			depth += 1;
			continue;
		}

		if (character === ")" || character === "]" || character === "}") {
			depth = Math.max(0, depth - 1);
			continue;
		}

		if (depth === 0 && expression.slice(index, index + operator.length) === operator) {
			return index;
		}
	}

	return -1;
}

function splitByTopLevelDelimiter(expression, delimiterCharacter) {
	const parts = [];
	let quote = null;
	let depth = 0;
	let startIndex = 0;

	for (let index = 0; index < expression.length; index += 1) {
		const character = expression[index];
		if ((character === '"' || character === "'") && expression[index - 1] !== "\\") {
			quote = quote === character ? null : quote || character;
			continue;
		}

		if (quote) {
			continue;
		}

		if (character === "(" || character === "[" || character === "{") {
			depth += 1;
			continue;
		}

		if (character === ")" || character === "]" || character === "}") {
			depth = Math.max(0, depth - 1);
			continue;
		}

		if (depth === 0 && character === delimiterCharacter) {
			parts.push(expression.slice(startIndex, index));
			startIndex = index + 1;
		}
	}

	parts.push(expression.slice(startIndex));
	return parts;
}

function parseTopLevelFunctionCall(expression) {
	const trimmedExpression = expression.trim();
	const nameMatch = trimmedExpression.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
	if (!nameMatch) {
		return null;
	}

	const functionName = nameMatch[1];
	const openParenthesisIndex = trimmedExpression.indexOf("(");
	let quote = null;
	let depth = 0;
	let closeParenthesisIndex = -1;

	for (let index = openParenthesisIndex; index < trimmedExpression.length; index += 1) {
		const character = trimmedExpression[index];
		if ((character === '"' || character === "'") && trimmedExpression[index - 1] !== "\\") {
			quote = quote === character ? null : quote || character;
			continue;
		}

		if (quote) {
			continue;
		}

		if (character === "(") {
			depth += 1;
		} else if (character === ")") {
			depth -= 1;
			if (depth === 0) {
				closeParenthesisIndex = index;
				break;
			}
		}
	}

	if (closeParenthesisIndex === -1) {
		return null;
	}

	const trailingText = trimmedExpression.slice(closeParenthesisIndex + 1).trim();
	if (trailingText) {
		return null;
	}

	const argumentsExpression = trimmedExpression.slice(openParenthesisIndex + 1, closeParenthesisIndex).trim();
	const argumentExpressions = argumentsExpression
		? splitByTopLevelDelimiter(argumentsExpression, ",").map((part) => part.trim())
		: [];

	return {
		functionName,
		argumentExpressions
	};
}

function parseObjectLiteralExpression(expression) {
	const trimmedExpression = expression.trim();
	if (!trimmedExpression.startsWith("{") || !trimmedExpression.endsWith("}")) {
		return null;
	}

	const bodyExpression = trimmedExpression.slice(1, -1).trim();
	if (!bodyExpression) {
		return [];
	}

	const objectEntries = [];
	const entryExpressions = splitByTopLevelDelimiter(bodyExpression, ",");
	for (const entryExpression of entryExpressions) {
		const normalizedEntryExpression = entryExpression.trim();
		if (!normalizedEntryExpression) {
			continue;
		}

		const colonIndex = findOperatorIndex(normalizedEntryExpression, ":");
		if (colonIndex <= 0) {
			return null;
		}

		const rawKeyExpression = normalizedEntryExpression.slice(0, colonIndex).trim();
		const valueExpression = normalizedEntryExpression.slice(colonIndex + 1).trim();
		if (!rawKeyExpression || !valueExpression) {
			return null;
		}

		let keyName = rawKeyExpression;
		if (
			(rawKeyExpression.startsWith('"') && rawKeyExpression.endsWith('"')) ||
			(rawKeyExpression.startsWith("'") && rawKeyExpression.endsWith("'"))
		) {
			keyName = rawKeyExpression.slice(1, -1);
		} else if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(rawKeyExpression)) {
			return null;
		}

		objectEntries.push({
			keyName,
			valueExpression
		});
	}

	return objectEntries;
}

function invokeRegisteredHelper(templateEngine, helperName, helperArguments, settings, node) {
	const helperFunction = templateEngine.helpersByName.get(helperName);
	if (typeof helperFunction !== "function") {
		throw createRenderError(
			settings.templateFilePath,
			`Missing helper '${helperName}'.`,
			"TEMPLATE_RENDER_MISSING_HELPER",
			node
		);
	}

	try {
		return helperFunction(...helperArguments);
	} catch (error) {
		throw createRenderError(
			settings.templateFilePath,
			`Helper '${helperName}' failed during execution.`,
			"TEMPLATE_RENDER_HELPER_EXECUTION_FAILED",
			node,
			error
		);
	}
}

function evaluateExpression(expression, scopeFrames, settings, node, templateEngine, runtimeState) {
	const trimmedExpression = expression.trim();

	if (!trimmedExpression) {
		return undefined;
	}

	const pipeSegments = splitByTopLevelDelimiter(trimmedExpression, "|").map((segment) => segment.trim());
	if (pipeSegments.length > 1) {
		let currentValue = evaluateExpression(
			pipeSegments[0],
			scopeFrames,
			settings,
			node,
			templateEngine,
			runtimeState
		);

		for (let index = 1; index < pipeSegments.length; index += 1) {
			const pipeSegment = pipeSegments[index];
			if (!pipeSegment) {
				throw createRenderError(
					settings.templateFilePath,
					"Invalid helper pipe segment.",
					"TEMPLATE_RENDER_INVALID_HELPER_SYNTAX",
					node
				);
			}

			const helperCall = parseTopLevelFunctionCall(pipeSegment);
			if (helperCall) {
				const helperArguments = [currentValue];
				for (const argumentExpression of helperCall.argumentExpressions) {
					helperArguments.push(
						evaluateExpression(
							argumentExpression,
							scopeFrames,
							settings,
							node,
							templateEngine,
							runtimeState
						)
					);
				}
				currentValue = invokeRegisteredHelper(
					templateEngine,
					helperCall.functionName,
					helperArguments,
					settings,
					node
				);
				continue;
			}

			if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(pipeSegment)) {
				throw createRenderError(
					settings.templateFilePath,
					`Invalid helper pipe segment '${pipeSegment}'.`,
					"TEMPLATE_RENDER_INVALID_HELPER_SYNTAX",
					node
				);
			}

			currentValue = invokeRegisteredHelper(
				templateEngine,
				pipeSegment,
				[currentValue],
				settings,
				node
			);
		}

		return currentValue;
	}

	if (
		(trimmedExpression.startsWith("(") && trimmedExpression.endsWith(")")) ||
		(trimmedExpression.startsWith("[") && trimmedExpression.endsWith("]"))
	) {
		const innerExpression = trimmedExpression.slice(1, -1).trim();
		return evaluateExpression(
			innerExpression,
			scopeFrames,
			settings,
			node,
			templateEngine,
			runtimeState
		);
	}

	if (trimmedExpression.startsWith("!")) {
		return !evaluateExpression(
			trimmedExpression.slice(1),
			scopeFrames,
			settings,
			node,
			templateEngine,
			runtimeState
		);
	}

	const objectLiteralEntries = parseObjectLiteralExpression(trimmedExpression);
	if (objectLiteralEntries) {
		const objectValue = {};
		for (const objectEntry of objectLiteralEntries) {
			objectValue[objectEntry.keyName] = evaluateExpression(
				objectEntry.valueExpression,
				scopeFrames,
				settings,
				node,
				templateEngine,
				runtimeState
			);
		}

		return objectValue;
	}

	const topLevelFunctionCall = parseTopLevelFunctionCall(trimmedExpression);
	if (topLevelFunctionCall) {
		const helperArguments = [];
		for (const argumentExpression of topLevelFunctionCall.argumentExpressions) {
			helperArguments.push(
				evaluateExpression(
					argumentExpression,
					scopeFrames,
					settings,
					node,
					templateEngine,
					runtimeState
				)
			);
		}

		if (topLevelFunctionCall.functionName === "fn") {
			if (helperArguments.length === 0 || typeof helperArguments[0] !== "string") {
				throw createRenderError(
					settings.templateFilePath,
					"fn(path, argsObject) requires the first argument to be a string path.",
					"TEMPLATE_RENDER_FUNCTION_INVALID_ARGUMENTS",
					node
				);
			}

			const argumentObject = helperArguments.length > 1 ? helperArguments[1] : {};
			const functionOutput = invokeFunctionTemplate(templateEngine, helperArguments[0], argumentObject, {
				settings,
				node,
				functionPathStack: runtimeState.functionPathStack,
				maxFunctionTemplateDepth:
					templateEngine.options.maxFunctionTemplateDepth ?? settings.maxFunctionTemplateDepth ?? 25,
				createFunctionRenderError: (message, code, cause = null) =>
					createRenderError(settings.templateFilePath, message, code, node, cause),
				renderFunctionTemplateSource: (
					functionTemplateSource,
					functionTemplateFilePath,
					functionArgumentObject,
					nextFunctionPathStack
				) => {
					const functionScopeFrames = [
						{
							localBindings: {},
							contextValue: functionArgumentObject
						}
					];

					return renderTemplateInternal(
						templateEngine,
						functionTemplateSource,
						functionScopeFrames,
						{
							...settings,
							templateFilePath: functionTemplateFilePath
						},
						{
							...runtimeState,
							functionPathStack: nextFunctionPathStack
						}
					);
				}
			});
			return createRawTemplateOutputValue(functionOutput);
		}

		return invokeRegisteredHelper(
			templateEngine,
			topLevelFunctionCall.functionName,
			helperArguments,
			settings,
			node
		);
	}

	for (const operator of ["===", "!==", ">=", "<=", ">", "<", "+"]) {
		const operatorIndex = findOperatorIndex(trimmedExpression, operator);
		if (operatorIndex > 0) {
			const leftExpression = trimmedExpression.slice(0, operatorIndex);
			const rightExpression = trimmedExpression.slice(operatorIndex + operator.length);
			const leftValue = evaluateExpression(
				leftExpression,
				scopeFrames,
				settings,
				node,
				templateEngine,
				runtimeState
			);
			const rightValue = evaluateExpression(
				rightExpression,
				scopeFrames,
				settings,
				node,
				templateEngine,
				runtimeState
			);

			if (operator === "===") {
				return leftValue === rightValue;
			}

			if (operator === "!==") {
				return leftValue !== rightValue;
			}

			if (operator === ">=") {
				return leftValue >= rightValue;
			}

			if (operator === "<=") {
				return leftValue <= rightValue;
			}

			if (operator === ">") {
				return leftValue > rightValue;
			}

			if (operator === "<") {
				return leftValue < rightValue;
			}

			if (operator === "+") {
				return leftValue + rightValue;
			}
		}
	}

	if (
		(trimmedExpression.startsWith('"') && trimmedExpression.endsWith('"')) ||
		(trimmedExpression.startsWith("'") && trimmedExpression.endsWith("'"))
	) {
		return trimmedExpression.slice(1, -1);
	}

	if (/^-?\d+(?:\.\d+)?$/.test(trimmedExpression)) {
		return Number(trimmedExpression);
	}

	if (trimmedExpression === "true") {
		return true;
	}

	if (trimmedExpression === "false") {
		return false;
	}

	if (trimmedExpression === "null") {
		return null;
	}

	const resolved = resolvePath(trimmedExpression, scopeFrames, node, settings.templateFilePath);
	if (!resolved.found) {
		if (settings.strictMissingKeyErrors) {
			throw createRenderError(
				settings.templateFilePath,
				`Missing key '${trimmedExpression}'.`,
				"TEMPLATE_RENDER_MISSING_KEY",
				node
			);
		}

		return undefined;
	}

	return resolved.value;
}

function resolveTemplatePath(templateEngine, requestedPath, parentTemplateFilePath, node, settings) {
	if (!requestedPath || typeof requestedPath !== "string") {
		throw createRenderError(
			settings.templateFilePath,
			"Template path must be a non-empty string.",
			"TEMPLATE_RENDER_INVALID_TEMPLATE_PATH",
			node
		);
	}

	const templateRootDirectoryPath = resolve(templateEngine.options.templateRootDirectoryPath || ".");
	const startDirectoryPath = parentTemplateFilePath
		? dirname(parentTemplateFilePath)
		: templateRootDirectoryPath;
	const resolvedTemplatePath = resolve(startDirectoryPath, requestedPath);

	if (
		resolvedTemplatePath !== templateRootDirectoryPath &&
		!resolvedTemplatePath.startsWith(`${templateRootDirectoryPath}${sep}`)
	) {
		throw createRenderError(
			settings.templateFilePath,
			`Template path '${requestedPath}' resolves outside template root.`,
			"TEMPLATE_RENDER_TEMPLATE_PATH_OUTSIDE_ROOT",
			node
		);
	}

	return resolvedTemplatePath;
}

function isLikelyTemplatePath(partialValue) {
	return (
		partialValue.startsWith("./") ||
		partialValue.startsWith("../") ||
		partialValue.startsWith("/") ||
		partialValue.endsWith(".html")
	);
}

function readTemplateFileOrThrow(resolvedTemplatePath, settings, node, templateEngine) {
	try {
		if (settings.enableTemplateFileCache) {
			const fileStat = statSync(resolvedTemplatePath);
			const cachedTemplateFile = templateEngine.templateFileCacheByPath.get(resolvedTemplatePath);
			if (
				cachedTemplateFile &&
				cachedTemplateFile.lastModifiedMilliseconds === fileStat.mtimeMs
			) {
				return cachedTemplateFile.templateSource;
			}

			const templateSource = readFileSync(resolvedTemplatePath, "utf8");
			templateEngine.templateFileCacheByPath.set(resolvedTemplatePath, {
				lastModifiedMilliseconds: fileStat.mtimeMs,
				templateSource
			});
			return templateSource;
		}

		return readFileSync(resolvedTemplatePath, "utf8");
	} catch (error) {
		if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
			throw createRenderError(
				settings.templateFilePath,
				`Missing partial/include template at '${resolvedTemplatePath}'.`,
				"TEMPLATE_RENDER_MISSING_PARTIAL",
				node,
				error
			);
		}

		throw createRenderError(
			settings.templateFilePath,
			`Failed to read included template '${resolvedTemplatePath}'.`,
			"TEMPLATE_RENDER_INCLUDE_READ_FAILED",
			node,
			error
		);
	}
}

function parseTemplate(templateString, templateFilePath) {
	const rootNode = {
		type: "root",
		extendsPathExpression: null,
		children: []
	};
	const blockStack = [
		{
			type: "root",
			node: rootNode,
			branchIndex: 0
		}
	];

	const getCurrentChildren = () => {
		const activeFrame = blockStack[blockStack.length - 1];
		if (activeFrame.type === "if") {
			return activeFrame.node.branches[activeFrame.branchIndex].children;
		}

		return activeFrame.node.children;
	};

	const findNextOpenTag = (cursor) => {
		const openTagCandidates = ["{{{", "{{", "{%", "{#"];
		let nearestCandidate = null;
		let nearestIndex = -1;

		for (const candidate of openTagCandidates) {
			const candidateIndex = templateString.indexOf(candidate, cursor);
			if (candidateIndex === -1) {
				continue;
			}

			if (nearestIndex === -1 || candidateIndex < nearestIndex) {
				nearestIndex = candidateIndex;
				nearestCandidate = candidate;
			}
		}

		return {
			openTag: nearestCandidate,
			openIndex: nearestIndex
		};
	};

	let cursor = 0;
	while (cursor < templateString.length) {
		const { openTag, openIndex } = findNextOpenTag(cursor);

		if (!openTag || openIndex === -1) {
			getCurrentChildren().push({
				type: "text",
				value: templateString.slice(cursor)
			});
			break;
		}

		if (openIndex > cursor) {
			getCurrentChildren().push({
				type: "text",
				value: templateString.slice(cursor, openIndex)
			});
		}

		if (openTag === "{#") {
			const closeIndex = templateString.indexOf("#}", openIndex + 2);
			if (closeIndex === -1) {
				throw createParseError(
					templateString,
					templateFilePath,
					"Unclosed comment tag.",
					"TEMPLATE_PARSE_UNCLOSED_COMMENT",
					openIndex,
					templateString.slice(openIndex, Math.min(openIndex + 30, templateString.length))
				);
			}

			cursor = closeIndex + 2;
			continue;
		}

		if (openTag === "{{" || openTag === "{{{") {
			const isRawInterpolation = openTag === "{{{";
			const closeToken = isRawInterpolation ? "}}}" : "}}";
			const closeIndex = templateString.indexOf(closeToken, openIndex + openTag.length);

			if (closeIndex === -1) {
				throw createParseError(
					templateString,
					templateFilePath,
					"Unclosed template tag.",
					"TEMPLATE_PARSE_UNCLOSED_TAG",
					openIndex,
					templateString.slice(openIndex, Math.min(openIndex + 30, templateString.length))
				);
			}

			const rawTagBody = templateString.slice(openIndex + openTag.length, closeIndex);
			const tagBody = rawTagBody.trim();
			const tagSnippet = templateString.slice(openIndex, closeIndex + closeToken.length);
			const { line, column } = getLineAndColumn(templateString, openIndex);

			if (!tagBody) {
				throw createParseError(
					templateString,
					templateFilePath,
					"Empty template tag is not allowed.",
					"TEMPLATE_PARSE_EMPTY_TAG",
					openIndex,
					tagSnippet
				);
			}

			if (isRawInterpolation) {
				if (tagBody.startsWith("#") || tagBody.startsWith("/") || tagBody === "else") {
					throw createParseError(
						templateString,
						templateFilePath,
						"Block syntax is not allowed in raw tags.",
						"TEMPLATE_PARSE_INVALID_RAW_TAG",
						openIndex,
						tagSnippet
					);
				}

				getCurrentChildren().push({
					type: "interpolation",
					expression: tagBody,
					raw: true,
					line,
					column,
					snippet: tagSnippet
				});
				cursor = closeIndex + closeToken.length;
				continue;
			}

			if (tagBody.startsWith("!")) {
				cursor = closeIndex + closeToken.length;
				continue;
			}

			if (tagBody.startsWith("#if ")) {
				const conditionExpression = tagBody.slice(4).trim();
				const ifNode = {
					type: "if",
					branches: [
						{
							conditionExpression,
							children: []
						}
					],
					line,
					column,
					snippet: tagSnippet
				};
				getCurrentChildren().push(ifNode);
				blockStack.push({
					type: "if",
					node: ifNode,
					branchIndex: 0
				});
				cursor = closeIndex + closeToken.length;
				continue;
			}

			if (tagBody === "else") {
				const activeFrame = blockStack[blockStack.length - 1];
				if (activeFrame.type !== "if") {
					throw createParseError(
						templateString,
						templateFilePath,
						"Else tag must be inside an if block.",
						"TEMPLATE_PARSE_ELSE_OUTSIDE_IF",
						openIndex,
						tagSnippet
					);
				}

				activeFrame.node.branches.push({
					conditionExpression: null,
					children: []
				});
				activeFrame.branchIndex = activeFrame.node.branches.length - 1;
				cursor = closeIndex + closeToken.length;
				continue;
			}

			if (tagBody === "/if") {
				const activeFrame = blockStack[blockStack.length - 1];
				if (activeFrame.type !== "if") {
					throw createParseError(
						templateString,
						templateFilePath,
						"Mismatched closing tag for if block.",
						"TEMPLATE_PARSE_MISMATCHED_CLOSING_TAG",
						openIndex,
						tagSnippet
					);
				}

				blockStack.pop();
				cursor = closeIndex + closeToken.length;
				continue;
			}

			if (tagBody.startsWith("#each ")) {
				const eachExpression = tagBody.slice(6).trim();
				const eachMatch = eachExpression.match(
					/^(.+?)\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s*,\s*([a-zA-Z_$][a-zA-Z0-9_$]*))?$/
				);
				if (!eachMatch) {
					throw createParseError(
						templateString,
						templateFilePath,
						"Each block must use '#each listPath as item' syntax.",
						"TEMPLATE_PARSE_INVALID_EACH_BLOCK",
						openIndex,
						tagSnippet
					);
				}

				const [, listExpression, itemName, indexName] = eachMatch;
				const eachNode = {
					type: "for",
					listExpression: listExpression.trim(),
					itemName,
					indexName: indexName || null,
					children: [],
					line,
					column,
					snippet: tagSnippet
				};
				getCurrentChildren().push(eachNode);
				blockStack.push({
					type: "for",
					node: eachNode,
					branchIndex: 0
				});
				cursor = closeIndex + closeToken.length;
				continue;
			}

			if (tagBody === "/each") {
				const activeFrame = blockStack[blockStack.length - 1];
				if (activeFrame.type !== "for") {
					throw createParseError(
						templateString,
						templateFilePath,
						"Mismatched closing tag for each block.",
						"TEMPLATE_PARSE_MISMATCHED_CLOSING_TAG",
						openIndex,
						tagSnippet
					);
				}

				blockStack.pop();
				cursor = closeIndex + closeToken.length;
				continue;
			}

			if (tagBody.startsWith("#") || tagBody.startsWith("/")) {
				throw createParseError(
					templateString,
					templateFilePath,
					"Unsupported block tag.",
					"TEMPLATE_PARSE_UNSUPPORTED_BLOCK_TAG",
					openIndex,
					tagSnippet
				);
			}

			getCurrentChildren().push({
				type: "interpolation",
				expression: tagBody,
				raw: false,
				line,
				column,
				snippet: tagSnippet
			});
			cursor = closeIndex + closeToken.length;
			continue;
		}

		if (openTag === "{%") {
			const closeIndex = templateString.indexOf("%}", openIndex + 2);
			if (closeIndex === -1) {
				throw createParseError(
					templateString,
					templateFilePath,
					"Unclosed directive tag.",
					"TEMPLATE_PARSE_UNCLOSED_DIRECTIVE",
					openIndex,
					templateString.slice(openIndex, Math.min(openIndex + 30, templateString.length))
				);
			}

			const directiveBody = templateString.slice(openIndex + 2, closeIndex).trim();
			const directiveSnippet = templateString.slice(openIndex, closeIndex + 2);
			const { line, column } = getLineAndColumn(templateString, openIndex);

			if (!directiveBody) {
				throw createParseError(
					templateString,
					templateFilePath,
					"Empty directive is not allowed.",
					"TEMPLATE_PARSE_EMPTY_DIRECTIVE",
					openIndex,
					directiveSnippet
				);
			}

			if (directiveBody.startsWith("if ")) {
				const conditionExpression = directiveBody.slice(3).trim();
				const ifNode = {
					type: "if",
					branches: [
						{
							conditionExpression,
							children: []
						}
					],
					line,
					column,
					snippet: directiveSnippet
				};
				getCurrentChildren().push(ifNode);
				blockStack.push({
					type: "if",
					node: ifNode,
					branchIndex: 0
				});
				cursor = closeIndex + 2;
				continue;
			}

			if (directiveBody.startsWith("else if ")) {
				const activeFrame = blockStack[blockStack.length - 1];
				if (activeFrame.type !== "if") {
					throw createParseError(
						templateString,
						templateFilePath,
						"Else if must be inside an if block.",
						"TEMPLATE_PARSE_ELSE_IF_OUTSIDE_IF",
						openIndex,
						directiveSnippet
					);
				}

				const conditionExpression = directiveBody.slice(8).trim();
				activeFrame.node.branches.push({
					conditionExpression,
					children: []
				});
				activeFrame.branchIndex = activeFrame.node.branches.length - 1;
				cursor = closeIndex + 2;
				continue;
			}

			if (directiveBody === "else") {
				const activeFrame = blockStack[blockStack.length - 1];
				if (activeFrame.type !== "if") {
					throw createParseError(
						templateString,
						templateFilePath,
						"Else must be inside an if block.",
						"TEMPLATE_PARSE_ELSE_OUTSIDE_IF",
						openIndex,
						directiveSnippet
					);
				}

				activeFrame.node.branches.push({
					conditionExpression: null,
					children: []
				});
				activeFrame.branchIndex = activeFrame.node.branches.length - 1;
				cursor = closeIndex + 2;
				continue;
			}

			if (directiveBody === "end if" || directiveBody === "endif") {
				const activeFrame = blockStack[blockStack.length - 1];
				if (activeFrame.type !== "if") {
					throw createParseError(
						templateString,
						templateFilePath,
						"Mismatched end if directive.",
						"TEMPLATE_PARSE_MISMATCHED_CLOSING_TAG",
						openIndex,
						directiveSnippet
					);
				}

				blockStack.pop();
				cursor = closeIndex + 2;
				continue;
			}

			if (directiveBody.startsWith("for ")) {
				const forExpression = directiveBody.slice(4).trim();
				const forMatch = forExpression.match(
					/^([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s*,\s*([a-zA-Z_$][a-zA-Z0-9_$]*))?\s+in\s+(.+)$/
				);
				if (!forMatch) {
					throw createParseError(
						templateString,
						templateFilePath,
						"For block must use 'for item in items' syntax.",
						"TEMPLATE_PARSE_INVALID_FOR_BLOCK",
						openIndex,
						directiveSnippet
					);
				}

				const [, itemName, indexName, listExpression] = forMatch;
				const forNode = {
					type: "for",
					listExpression: listExpression.trim(),
					itemName,
					indexName: indexName || null,
					children: [],
					line,
					column,
					snippet: directiveSnippet
				};
				getCurrentChildren().push(forNode);
				blockStack.push({
					type: "for",
					node: forNode,
					branchIndex: 0
				});
				cursor = closeIndex + 2;
				continue;
			}

			if (directiveBody === "end for" || directiveBody === "endfor") {
				const activeFrame = blockStack[blockStack.length - 1];
				if (activeFrame.type !== "for") {
					throw createParseError(
						templateString,
						templateFilePath,
						"Mismatched end for directive.",
						"TEMPLATE_PARSE_MISMATCHED_CLOSING_TAG",
						openIndex,
						directiveSnippet
					);
				}

				blockStack.pop();
				cursor = closeIndex + 2;
				continue;
			}

			if (directiveBody.startsWith("include ")) {
				const includeExpression = directiveBody.slice(8).trim();
				getCurrentChildren().push({
					type: "include",
					templatePathExpression: includeExpression,
					line,
					column,
					snippet: directiveSnippet
				});
				cursor = closeIndex + 2;
				continue;
			}

			if (directiveBody.startsWith("function ")) {
				const functionExpression = directiveBody.slice(9).trim();
				const withIndex = functionExpression.indexOf(" with ");
				if (withIndex <= 0) {
					throw createParseError(
						templateString,
						templateFilePath,
						"Function directive must use 'function \"path\" with argsObject' syntax.",
						"TEMPLATE_PARSE_INVALID_FUNCTION_DIRECTIVE",
						openIndex,
						directiveSnippet
					);
				}

				const functionPathExpression = functionExpression.slice(0, withIndex).trim();
				const argumentObjectExpression = functionExpression.slice(withIndex + 6).trim();
				if (!functionPathExpression || !argumentObjectExpression) {
					throw createParseError(
						templateString,
						templateFilePath,
						"Function directive requires path and argument object expressions.",
						"TEMPLATE_PARSE_INVALID_FUNCTION_DIRECTIVE",
						openIndex,
						directiveSnippet
					);
				}

				getCurrentChildren().push({
					type: "function",
					functionPathExpression,
					argumentObjectExpression,
					line,
					column,
					snippet: directiveSnippet
				});
				cursor = closeIndex + 2;
				continue;
			}

			if (directiveBody.startsWith("set ")) {
				const setExpression = directiveBody.slice(4).trim();
				const setMatch = setExpression.match(
					/^([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s*=\s*(.+)|\s*(\+\+|--))$/
				);
				if (!setMatch) {
					throw createParseError(
						templateString,
						templateFilePath,
						"Set directive must use 'set name = expression' or 'set name++'.",
						"TEMPLATE_PARSE_INVALID_SET_DIRECTIVE",
						openIndex,
						directiveSnippet
					);
				}

				const [, variableName, assignedExpression, incrementOperator] = setMatch;
				getCurrentChildren().push({
					type: "set",
					variableName,
					assignedExpression: assignedExpression ? assignedExpression.trim() : null,
					incrementOperator: incrementOperator || null,
					line,
					column,
					snippet: directiveSnippet
				});
				cursor = closeIndex + 2;
				continue;
			}

			if (directiveBody.startsWith("extends ")) {
				if (blockStack.length > 1) {
					throw createParseError(
						templateString,
						templateFilePath,
						"Extends must be declared at the root level.",
						"TEMPLATE_PARSE_INVALID_EXTENDS_POSITION",
						openIndex,
						directiveSnippet
					);
				}

				rootNode.extendsPathExpression = directiveBody.slice(8).trim();
				cursor = closeIndex + 2;
				continue;
			}

			if (directiveBody.startsWith("block ")) {
				const blockName = directiveBody.slice(6).trim();
				if (!blockName) {
					throw createParseError(
						templateString,
						templateFilePath,
						"Block directive requires a block name.",
						"TEMPLATE_PARSE_INVALID_BLOCK_DIRECTIVE",
						openIndex,
						directiveSnippet
					);
				}

				const blockNode = {
					type: "block",
					name: blockName,
					children: [],
					line,
					column,
					snippet: directiveSnippet
				};
				getCurrentChildren().push(blockNode);
				blockStack.push({
					type: "block",
					node: blockNode,
					branchIndex: 0
				});
				cursor = closeIndex + 2;
				continue;
			}

			if (directiveBody.startsWith("endblock") || directiveBody.startsWith("end block")) {
				const activeFrame = blockStack[blockStack.length - 1];
				if (activeFrame.type !== "block") {
					throw createParseError(
						templateString,
						templateFilePath,
						"Mismatched endblock directive.",
						"TEMPLATE_PARSE_MISMATCHED_CLOSING_TAG",
						openIndex,
						directiveSnippet
					);
				}

				const declaredName = directiveBody
					.replace("endblock", "")
					.replace("end block", "")
					.trim();
				if (declaredName && declaredName !== activeFrame.node.name) {
					throw createParseError(
						templateString,
						templateFilePath,
						"Endblock name does not match the opened block.",
						"TEMPLATE_PARSE_BLOCK_NAME_MISMATCH",
						openIndex,
						directiveSnippet
					);
				}

				blockStack.pop();
				cursor = closeIndex + 2;
				continue;
			}

			throw createParseError(
				templateString,
				templateFilePath,
				"Unsupported directive syntax.",
				"TEMPLATE_PARSE_UNSUPPORTED_DIRECTIVE",
				openIndex,
				directiveSnippet
			);
		}
	}

	if (blockStack.length > 1) {
		const unclosedFrame = blockStack[blockStack.length - 1];
		throw createParseError(
			templateString,
			templateFilePath,
			`Unclosed block '${unclosedFrame.type}'.`,
			"TEMPLATE_PARSE_UNCLOSED_BLOCK",
			templateString.length,
			null
		);
	}

	return rootNode;
}

function getParsedTemplateRoot(templateEngine, templateString, settings) {
	if (!settings.enableTemplateParseCache) {
		return parseTemplate(templateString, settings.templateFilePath);
	}

	const cachedTemplateRoot = templateEngine.templateParseCacheBySource.get(templateString);
	if (cachedTemplateRoot) {
		return cachedTemplateRoot;
	}

	const parsedTemplateRoot = parseTemplate(templateString, settings.templateFilePath);
	templateEngine.templateParseCacheBySource.set(templateString, parsedTemplateRoot);
	return parsedTemplateRoot;
}

function renderNodes(nodes, scopeFrames, settings, templateEngine, runtimeState) {
	let output = "";

	for (const node of nodes) {
		if (node.type === "text") {
			output += node.value;
			continue;
		}

		if (node.type === "interpolation") {
			const expressionValue = evaluateExpression(
				node.expression,
				scopeFrames,
				settings,
				node,
				templateEngine,
				runtimeState
			);
			const rawTemplateOutputValue = readRawTemplateOutputValue(expressionValue);
			let renderedValue = toOutputString(expressionValue);
			if (rawTemplateOutputValue !== null) {
				renderedValue = rawTemplateOutputValue;
			} else if (!node.raw) {
				renderedValue = escapeHtml(renderedValue);
			} else if (!settings.allowRawOutput) {
				throw createRenderError(
					settings.templateFilePath,
					"Raw output is disabled by configuration.",
					"TEMPLATE_RENDER_RAW_OUTPUT_DISABLED",
					node
				);
			}

			output += renderedValue;
			continue;
		}

		if (node.type === "set") {
			let targetScopeFrame = scopeFrames[scopeFrames.length - 1];
			for (let index = scopeFrames.length - 1; index >= 0; index -= 1) {
				if (Object.prototype.hasOwnProperty.call(scopeFrames[index].localBindings, node.variableName)) {
					targetScopeFrame = scopeFrames[index];
					break;
				}
			}

			if (node.incrementOperator) {
				const currentValue = targetScopeFrame.localBindings[node.variableName] ?? 0;
				if (node.incrementOperator === "++") {
					targetScopeFrame.localBindings[node.variableName] = Number(currentValue) + 1;
				} else {
					targetScopeFrame.localBindings[node.variableName] = Number(currentValue) - 1;
				}
			} else {
				targetScopeFrame.localBindings[node.variableName] = evaluateExpression(
					node.assignedExpression,
					scopeFrames,
					settings,
					node,
					templateEngine,
					runtimeState
				);
			}
			continue;
		}

		if (node.type === "if") {
			let matchedBranch = null;

			for (const branch of node.branches) {
				if (branch.conditionExpression === null) {
					matchedBranch = branch;
					break;
				}

				const conditionValue = evaluateExpression(
					branch.conditionExpression,
					scopeFrames,
					settings,
					node,
					templateEngine,
					runtimeState
				);
				if (conditionValue) {
					matchedBranch = branch;
					break;
				}
			}

			if (matchedBranch) {
				output += renderNodes(matchedBranch.children, scopeFrames, settings, templateEngine, runtimeState);
			}
			continue;
		}

		if (node.type === "for") {
			const listValue = evaluateExpression(
				node.listExpression,
				scopeFrames,
				settings,
				node,
				templateEngine,
				runtimeState
			);
			if (!Array.isArray(listValue)) {
				if (settings.strictMissingKeyErrors) {
					throw createRenderError(
						settings.templateFilePath,
						`For block expected an array for '${node.listExpression}'.`,
						"TEMPLATE_RENDER_INVALID_FOR_TARGET",
						node
					);
				}

				continue;
			}

			for (let index = 0; index < listValue.length; index += 1) {
				const itemValue = listValue[index];
				const nestedScopeFrame = {
					localBindings: {
						[node.itemName]: itemValue
					},
					contextValue: itemValue
				};
				if (node.indexName) {
					nestedScopeFrame.localBindings[node.indexName] = index;
				}

				output += renderNodes(
					node.children,
					[...scopeFrames, nestedScopeFrame],
					settings,
					templateEngine,
					runtimeState
				);
			}
			continue;
		}

		if (node.type === "function") {
			const functionPathValue = evaluateExpression(
				node.functionPathExpression,
				scopeFrames,
				settings,
				node,
				templateEngine,
				runtimeState
			);
			if (typeof functionPathValue !== "string" || !functionPathValue.trim()) {
				throw createRenderError(
					settings.templateFilePath,
					"Function directive path must resolve to a non-empty string.",
					"TEMPLATE_RENDER_FUNCTION_INVALID_ARGUMENTS",
					node
				);
			}

			const argumentObject = evaluateExpression(
				node.argumentObjectExpression,
				scopeFrames,
				settings,
				node,
				templateEngine,
				runtimeState
			);
			const functionOutput = invokeFunctionTemplate(
				templateEngine,
				functionPathValue.trim(),
				argumentObject,
				{
					settings,
					node,
					functionPathStack: runtimeState.functionPathStack,
					maxFunctionTemplateDepth:
						templateEngine.options.maxFunctionTemplateDepth ?? settings.maxFunctionTemplateDepth ?? 25,
					createFunctionRenderError: (message, code, cause = null) =>
						createRenderError(settings.templateFilePath, message, code, node, cause),
					renderFunctionTemplateSource: (
						functionTemplateSource,
						functionTemplateFilePath,
						functionArgumentObject,
						nextFunctionPathStack
					) => {
						const functionScopeFrames = [
							{
								localBindings: {},
								contextValue: functionArgumentObject
							}
						];

						return renderTemplateInternal(
							templateEngine,
							functionTemplateSource,
							functionScopeFrames,
							{
								...settings,
								templateFilePath: functionTemplateFilePath
							},
							{
								...runtimeState,
								functionPathStack: nextFunctionPathStack
							}
						);
					}
				}
			);

			output += functionOutput;
			continue;
		}

		if (node.type === "include") {
			const includeTarget = evaluateExpression(
				node.templatePathExpression,
				scopeFrames,
				settings,
				node,
				templateEngine,
				runtimeState
			);
			const includeKey = toOutputString(includeTarget).trim();
			if (!includeKey) {
				throw createRenderError(
					settings.templateFilePath,
					"Include directive resolved to an empty target.",
					"TEMPLATE_RENDER_INVALID_TEMPLATE_PATH",
					node
				);
			}

			let includedTemplateString = null;
			let resolvedIncludePath = null;

			if (templateEngine.partialsByName.has(includeKey)) {
				const registeredPartialValue = templateEngine.partialsByName.get(includeKey);
				if (typeof registeredPartialValue !== "string") {
					throw createRenderError(
						settings.templateFilePath,
						`Registered partial '${includeKey}' must be a string template or file path.`,
						"TEMPLATE_RENDER_INVALID_PARTIAL_VALUE",
						node
					);
				}

				if (isLikelyTemplatePath(registeredPartialValue.trim())) {
					resolvedIncludePath = resolveTemplatePath(
						templateEngine,
						registeredPartialValue.trim(),
						settings.templateFilePath,
						node,
						settings
					);
					includedTemplateString = readTemplateFileOrThrow(
						resolvedIncludePath,
						settings,
						node,
						templateEngine
					);
				} else {
					includedTemplateString = registeredPartialValue;
				}
			} else {
				const includePathCandidates = [
					resolveTemplatePath(
						templateEngine,
						includeKey,
						settings.templateFilePath,
						node,
						settings
					)
				];
				if (!includeKey.startsWith("./") && !includeKey.startsWith("../") && !includeKey.startsWith("/")) {
					includePathCandidates.push(
						resolveTemplatePath(templateEngine, includeKey, null, node, settings)
					);
				}

				let lastReadError = null;
				for (const candidatePath of includePathCandidates) {
					try {
						includedTemplateString = readTemplateFileOrThrow(
							candidatePath,
							settings,
							node,
							templateEngine
						);
						resolvedIncludePath = candidatePath;
						lastReadError = null;
						break;
					} catch (error) {
						if (error && error.code === "TEMPLATE_RENDER_MISSING_PARTIAL") {
							lastReadError = error;
							continue;
						}

						throw error;
					}
				}

				if (lastReadError) {
					throw lastReadError;
				}
			}

			if (resolvedIncludePath && runtimeState.templatePathStack.includes(resolvedIncludePath)) {
				throw createRenderError(
					settings.templateFilePath,
					`Circular include detected for '${resolvedIncludePath}'.`,
					"TEMPLATE_RENDER_CIRCULAR_INCLUDE",
					node
				);
			}

			const includeOutput = renderTemplateInternal(
				templateEngine,
				includedTemplateString,
				scopeFrames,
				{
					...settings,
					templateFilePath: resolvedIncludePath || settings.templateFilePath
				},
				{
					...runtimeState,
					templatePathStack: resolvedIncludePath
						? [...runtimeState.templatePathStack, resolvedIncludePath]
						: runtimeState.templatePathStack
				}
			);
			output += includeOutput;
			continue;
		}

		if (node.type === "block") {
			const overrideNode = runtimeState.blockOverridesByName.get(node.name);
			if (overrideNode) {
				output += renderNodes(
					overrideNode.children,
					scopeFrames,
					settings,
					templateEngine,
					runtimeState
				);
			} else {
				output += renderNodes(node.children, scopeFrames, settings, templateEngine, runtimeState);
			}
			continue;
		}
	}

	return output;
}

function renderTemplateInternal(templateEngine, templateString, scopeFrames, settings, runtimeState) {
	const parsedTemplateRoot = getParsedTemplateRoot(templateEngine, templateString, settings);

	if (parsedTemplateRoot.extendsPathExpression) {
		const layoutPath = evaluateExpression(
			parsedTemplateRoot.extendsPathExpression,
			scopeFrames,
			settings,
			{ line: 1, column: 1, snippet: `{% extends ${parsedTemplateRoot.extendsPathExpression} %}` },
			templateEngine,
			runtimeState
		);
		const resolvedLayoutPath = resolveTemplatePath(
			templateEngine,
			String(layoutPath),
			settings.templateFilePath,
			null,
			settings
		);

		const pageBlockOverrides = new Map(runtimeState.blockOverridesByName);
		for (const node of parsedTemplateRoot.children) {
			if (node.type === "block") {
				pageBlockOverrides.set(node.name, node);
			}
		}

		const layoutTemplateString = readTemplateFileOrThrow(
			resolvedLayoutPath,
			settings,
			{ line: 1, column: 1, snippet: `{% extends ${parsedTemplateRoot.extendsPathExpression} %}` },
			templateEngine
		);
		return renderTemplateInternal(
			templateEngine,
			layoutTemplateString,
			scopeFrames,
			{
				...settings,
				templateFilePath: resolvedLayoutPath
			},
			{
				...runtimeState,
				templatePathStack: [...runtimeState.templatePathStack, resolvedLayoutPath],
				blockOverridesByName: pageBlockOverrides
			}
		);
	}

	return renderNodes(parsedTemplateRoot.children, scopeFrames, settings, templateEngine, runtimeState);
}

export function renderTemplate(templateEngine, templateString, contextData = {}, options = {}) {
	if (!templateEngine || !templateEngine.options) {
		throw new TypeError("A valid template engine instance is required.");
	}

	if (typeof templateString !== "string") {
		throw new TypeError("Template string must be a string.");
	}

	const settings = {
		templateFilePath: options.templateFilePath || null,
		strictMissingKeyErrors:
			options.strictMissingKeyErrors ?? templateEngine.options.strictMissingKeyErrors ?? false,
		allowRawOutput: options.allowRawOutput ?? templateEngine.options.allowRawOutput ?? true,
		enableTemplateParseCache:
			options.enableTemplateParseCache ?? templateEngine.options.enableTemplateParseCache ?? false,
		enableTemplateFileCache:
			options.enableTemplateFileCache ?? templateEngine.options.enableTemplateFileCache ?? false
	};

	const scopeFrames = [
		{
			localBindings: {},
			contextValue: contextData
		}
	];

	return renderTemplateInternal(templateEngine, templateString, scopeFrames, settings, {
		templatePathStack: settings.templateFilePath ? [settings.templateFilePath] : [],
		blockOverridesByName: new Map(),
		functionPathStack: []
	});
}
