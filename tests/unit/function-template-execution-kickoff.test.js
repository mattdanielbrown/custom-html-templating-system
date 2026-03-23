import test from "node:test";
import assert from "node:assert/strict";

import { createTemplateEngine } from "../../src/engine/create-template-engine.js";
import {
	resolveFunctionTemplatePath,
	invokeFunctionTemplate
} from "../../src/engine/function-template-runtime.js";

test("function runtime scaffold resolves function template paths within functions directory", () => {
	const templateEngine = createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates"
	});

	const resolvedFunctionTemplatePath = resolveFunctionTemplatePath(
		templateEngine,
		"navigation-menu-item.function.html"
	);

	assert.match(resolvedFunctionTemplatePath, /tests\/fixtures\/templates\/functions\/navigation-menu-item\.function\.html$/);
});

test("function runtime scaffold rejects traversal outside functions directory", () => {
	const templateEngine = createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates"
	});

	assert.throws(
		() => resolveFunctionTemplatePath(templateEngine, "../../../../etc/passwd"),
		/error|outside/i
	);
});

test("function runtime scaffold clearly marks invocation as not implemented", () => {
	assert.throws(
		() => invokeFunctionTemplate(),
		/not implemented/i
	);
});

test.todo("renders *.function.html template with explicit argument object");
test.todo("supports deterministic nested function template calls without recursion leaks");
test.todo("returns canonical function-render errors with file/line metadata");
