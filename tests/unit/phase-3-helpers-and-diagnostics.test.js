import test from "node:test";
import assert from "node:assert/strict";

import { createTemplateEngine } from "../../src/engine/create-template-engine.js";
import { registerHelper } from "../../src/engine/register-helper.js";
import { renderTemplate } from "../../src/engine/render-template.js";

function createEngine() {
	return createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates"
	});
}

test("helper registration stores callable helper functions", () => {
	const templateEngine = createEngine();
	const upperCaseHelper = (value) => String(value).toUpperCase();

	registerHelper(templateEngine, "upperCase", upperCaseHelper);

	assert.equal(templateEngine.helpersByName.get("upperCase"), upperCaseHelper);
});

test("helper invocation supports path and literal arguments", () => {
	const templateEngine = createEngine();
	registerHelper(templateEngine, "formatLabel", (value, label, suffix) => `${label}:${value}${suffix}`);

	const outputHtml = renderTemplate(
		templateEngine,
		"<p>{{ formatLabel(page.title, \"Page\", \"!\") }}</p>",
		{
			page: {
				title: "Home"
			}
		}
	);

	assert.equal(outputHtml, "<p>Page:Home!</p>");
});

test("pipe/filter syntax invokes helper deterministically", () => {
	const templateEngine = createEngine();
	registerHelper(templateEngine, "toUpperCase", (value) => String(value).toUpperCase());
	registerHelper(templateEngine, "wrap", (value, prefix, suffix) => `${prefix}${value}${suffix}`);

	const outputHtml = renderTemplate(
		templateEngine,
		"{{ toUpperCase(page.title) }}|{{ page.title | toUpperCase }}|{{ page.title | wrap(\"[\", \"]\") }}",
		{
			page: {
				title: "Home"
			}
		}
	);

	assert.equal(outputHtml, "HOME|HOME|[Home]");
});

test("missing helper throws canonical render error", () => {
	const templateEngine = createEngine();

	assert.throws(
		() => {
			renderTemplate(templateEngine, "{{ missingHelper(page.title) }}", {
				page: {
					title: "Home"
				}
			});
		},
		(error) => {
			assert.equal(error.errorName, "TemplateRenderError");
			assert.equal(error.name, "TemplateRenderError");
			assert.equal(error.code, "TEMPLATE_RENDER_MISSING_HELPER");
			assert.equal(typeof error.message, "string");
			assert.equal(typeof error.line, "number");
			assert.equal(typeof error.column, "number");
			assert.ok("snippet" in error);
			assert.ok("templateFilePath" in error);
			return true;
		}
	);
});

test("parse errors include line and column metadata", () => {
	const templateEngine = createEngine();

	assert.throws(
		() => {
			renderTemplate(
				templateEngine,
				"<main>\n\t{{ formatLabel(page.title, \"Page\") \n</main>",
				{
					page: {
						title: "Home"
					}
				},
				{ templateFilePath: "./tests/fixtures/templates/pages/invalid.page.html" }
			);
		},
		(error) => {
			assert.equal(error.errorName, "TemplateParseError");
			assert.equal(error.name, "TemplateParseError");
			assert.equal(error.code, "TEMPLATE_PARSE_UNCLOSED_TAG");
			assert.equal(error.templateFilePath, "./tests/fixtures/templates/pages/invalid.page.html");
			assert.equal(typeof error.line, "number");
			assert.equal(typeof error.column, "number");
			assert.equal(typeof error.message, "string");
			assert.ok("snippet" in error);
			return true;
		}
	);
});
