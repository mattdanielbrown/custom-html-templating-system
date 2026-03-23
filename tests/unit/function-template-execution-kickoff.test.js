import test from "node:test";
import assert from "node:assert/strict";

import { createTemplateEngine } from "../../src/engine/create-template-engine.js";
import { resolveFunctionTemplatePath } from "../../src/engine/function-template-runtime.js";
import { renderTemplate } from "../../src/engine/render-template.js";
import { renderTemplateFile } from "../../src/engine/render-template-file.js";

test("function runtime resolves function template paths within functions directory", () => {
	const templateEngine = createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates"
	});

	const resolvedFunctionTemplatePath = resolveFunctionTemplatePath(
		templateEngine,
		"navigation-menu-item.function.html"
	);

	assert.match(
		resolvedFunctionTemplatePath,
		/tests\/fixtures\/templates\/functions\/navigation-menu-item\.function\.html$/
	);
});

test("renders *.function.html template with explicit argument object via fn(...)", () => {
	const templateEngine = createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates"
	});

	const outputHtml = renderTemplate(
		templateEngine,
		"{{ fn(\"navigation-menu-link.function.html\", { item: pageItem }) }}",
		{
			pageItem: {
				file: "/services",
				title: "Services"
			}
		}
	);

	assert.equal(outputHtml, '<a href="/services">Services</a>\n');
});

test("renders *.function.html template with directive syntax", () => {
	const templateEngine = createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates"
	});

	const outputHtml = renderTemplate(
		templateEngine,
		"{% function \"navigation-menu-link.function.html\" with { item: pageItem } %}",
		{
			pageItem: {
				file: "/contact",
				title: "Contact"
			}
		}
	);

	assert.equal(outputHtml, '<a href="/contact">Contact</a>\n');
});

test("supports deterministic nested function template calls without recursion leaks", () => {
	const templateEngine = createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates"
	});

	const outputHtml = renderTemplate(
		templateEngine,
		"{{ fn(\"navigation-menu-item.function.html\", { item: pageItem }) }}",
		{
			pageItem: {
				file: "/gallery",
				title: "Gallery"
			}
		}
	);

	assert.equal(outputHtml, '<li><a href="/gallery">Gallery</a>\n</li>\n');
});

test("returns canonical function-render errors with file/line metadata", () => {
	const templateEngine = createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates"
	});

	assert.throws(
		() => {
			renderTemplate(
				templateEngine,
				"{{ fn(\"does-not-exist.function.html\", { item: pageItem }) }}",
				{ pageItem: { file: "/", title: "Home" } },
				{ templateFilePath: "./tests/fixtures/templates/pages/missing-function.page.html" }
			);
		},
		(error) => {
			assert.equal(error.errorName, "TemplateRenderError");
			assert.equal(error.code, "TEMPLATE_RENDER_FUNCTION_NOT_FOUND");
			assert.equal(error.templateFilePath, "./tests/fixtures/templates/pages/missing-function.page.html");
			assert.equal(typeof error.line, "number");
			assert.equal(typeof error.column, "number");
			assert.equal(typeof error.snippet, "string");
			return true;
		}
	);

	assert.throws(
		() => {
			renderTemplate(
				templateEngine,
				"{{ fn(\"../../../../etc/passwd\", { item: pageItem }) }}",
				{ pageItem: { file: "/", title: "Home" } }
			);
		},
		(error) => {
			assert.equal(error.errorName, "TemplateRenderError");
			assert.equal(error.code, "TEMPLATE_RENDER_FUNCTION_PATH_OUTSIDE_ROOT");
			return true;
		}
	);

	assert.throws(
		() => {
			renderTemplate(
				templateEngine,
				"{{ fn(\"navigation-menu-link.function.html\", \"not-object\") }}",
				{}
			);
		},
		(error) => {
			assert.equal(error.errorName, "TemplateRenderError");
			assert.equal(error.code, "TEMPLATE_RENDER_FUNCTION_INVALID_ARGUMENTS");
			return true;
		}
	);

	assert.throws(
		() => {
			renderTemplate(
				templateEngine,
				"{{ fn(\"recursive-a.function.html\", { value: \"x\" }) }}",
				{}
			);
		},
		(error) => {
			assert.equal(error.errorName, "TemplateRenderError");
			assert.equal(error.code, "TEMPLATE_RENDER_FUNCTION_RECURSION");
			return true;
		}
	);
});

test("integration: page + layout + partial + function templates render together", async () => {
	const templateEngine = createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates"
	});

	const outputHtml = await renderTemplateFile(
		templateEngine,
		"pages/function-integration.page.html",
		{
			page: {
				title: "Function Integration",
				navigation: [
					{ file: "/", title: "Home" },
					{ file: "/contact", title: "Contact" }
				],
				featured: { file: "/featured", title: "Featured" }
			}
		}
	);

	assert.match(outputHtml, /<title>Function Integration<\/title>/);
	assert.match(outputHtml, /<li><a href="\/">Home<\/a>/);
	assert.match(outputHtml, /<li><a href="\/contact">Contact<\/a>/);
	assert.match(outputHtml, /<section>\s*<a href="\/featured">Featured<\/a>/);
});
