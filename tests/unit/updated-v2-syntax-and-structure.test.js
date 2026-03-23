import test from "node:test";
import assert from "node:assert/strict";

import { createTemplateEngine } from "../../src/engine/create-template-engine.js";
import { renderTemplate } from "../../src/engine/render-template.js";
import { renderTemplateFile } from "../../src/engine/render-template-file.js";

test("supports v2 conditional and loop directives", () => {
	const templateEngine = createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates"
	});

	const templateString = [
		"{% set i = 0 %}",
		"{% for pageItem in pageData %}",
		"{% if i === 0 %}",
		"<a href=\"{{ pageItem.file }}\" aria-current=\"page\">{{ pageItem.title }}</a>",
		"{% else %}",
		"<a href=\"{{ pageItem.file }}\">{{ pageItem.title }}</a>",
		"{% end if %}",
		"{% set i++ %}",
		"{% end for %}"
	].join("");

	const outputHtml = renderTemplate(templateEngine, templateString, {
		pageData: [
			{ index: 0, file: "/", title: "Home" },
			{ index: 1, file: "/contact", title: "Contact" }
		]
	});

	assert.equal(
		outputHtml,
		"<a href=\"/\" aria-current=\"page\">Home</a><a href=\"/contact\">Contact</a>"
	);
});

test("supports include, extends, and block override with page/layout naming conventions", async () => {
	const templateEngine = createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates"
	});

	const outputHtml = await renderTemplateFile(
		templateEngine,
		"pages/index.page.html",
		{
			page: {
				title: "Index",
				file: "/",
				navigation: [
					{ file: "/", title: "Home" },
					{ file: "/contact", title: "Contact" }
				],
				cards: ["First", "Second"]
			}
		}
	);

	assert.match(outputHtml, /<title>Index<\/title>/);
	assert.match(outputHtml, /aria-current="page">Home<\/a>/);
	assert.match(outputHtml, /<article data-index="0">First<\/article>/);
	assert.match(outputHtml, /<article data-index="1">Second<\/article>/);
});

test("supports v2 comment tag syntax", () => {
	const templateEngine = createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates"
	});

	const outputHtml = renderTemplate(
		templateEngine,
		"<div>{# ignored #}<span>{{ page.title }}</span></div>",
		{
			page: {
				title: "Hello"
			}
		}
	);

	assert.equal(outputHtml, "<div><span>Hello</span></div>");
});
