import test from "node:test";
import assert from "node:assert/strict";

import { createTemplateEngine } from "../../src/engine/create-template-engine.js";
import { registerPartial } from "../../src/engine/register-partial.js";
import { renderTemplate } from "../../src/engine/render-template.js";
import { renderTemplateFile } from "../../src/engine/render-template-file.js";

function createEngine() {
	return createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates"
	});
}

test("render-template-file loads from template root directory", async () => {
	const templateEngine = createEngine();
	const outputHtml = await renderTemplateFile(templateEngine, "pages/index.page.html", {
		page: {
			title: "Phase2",
			file: "/",
			navigation: [{ file: "/", title: "Home" }],
			cards: ["Card A"]
		}
	});

	assert.match(outputHtml, /<title>Phase2<\/title>/);
	assert.match(outputHtml, /<article data-index="0">Card A<\/article>/);
});

test("partial include resolves registered partials first", () => {
	const templateEngine = createEngine();
	registerPartial(
		templateEngine,
		"partials/phase-two-header.partial.html",
		"<header data-source=\"registered\">Registered Header</header>"
	);

	const outputHtml = renderTemplate(
		templateEngine,
		"{% include \"partials/phase-two-header.partial.html\" %}",
		{},
		{ templateFilePath: "./tests/fixtures/templates/pages/test.page.html" }
	);

	assert.equal(outputHtml, "<header data-source=\"registered\">Registered Header</header>");
});

test("partial file include fallback resolves from template root or template path", () => {
	const templateEngine = createEngine();
	const outputFromRootRelative = renderTemplate(
		templateEngine,
		"{% include \"partials/phase-two-header.partial.html\" %}",
		{},
		{ templateFilePath: "./tests/fixtures/templates/pages/test.page.html" }
	);
	const outputFromParentRelative = renderTemplate(
		templateEngine,
		"{% include \"../partials/phase-two-header.partial.html\" %}",
		{},
		{ templateFilePath: "./tests/fixtures/templates/pages/test.page.html" }
	);

	assert.equal(outputFromRootRelative, "<header data-source=\"file\">File Header</header>\n");
	assert.equal(outputFromParentRelative, "<header data-source=\"file\">File Header</header>\n");
});

test("missing partial include throws canonical render error shape", () => {
	const templateEngine = createEngine();

	assert.throws(
		() => {
			renderTemplate(
				templateEngine,
				"{% include \"partials/does-not-exist.partial.html\" %}",
				{},
				{ templateFilePath: "./tests/fixtures/templates/pages/test.page.html" }
			);
		},
		(error) => {
			assert.equal(error.errorName, "TemplateRenderError");
			assert.equal(error.name, "TemplateRenderError");
			assert.equal(error.code, "TEMPLATE_RENDER_MISSING_PARTIAL");
			assert.equal(typeof error.message, "string");
			assert.equal(typeof error.line, "number");
			assert.equal(typeof error.column, "number");
			assert.ok("snippet" in error);
			assert.ok("templateFilePath" in error);
			return true;
		}
	);
});

test("directory traversal attempts are rejected", () => {
	const templateEngine = createEngine();

	assert.throws(
		() => {
			renderTemplate(
				templateEngine,
				"{% include \"../../../../etc/passwd\" %}",
				{},
				{ templateFilePath: "./tests/fixtures/templates/pages/test.page.html" }
			);
		},
		(error) => {
			assert.equal(error.errorName, "TemplateRenderError");
			assert.equal(error.code, "TEMPLATE_RENDER_TEMPLATE_PATH_OUTSIDE_ROOT");
			return true;
		}
	);
});
