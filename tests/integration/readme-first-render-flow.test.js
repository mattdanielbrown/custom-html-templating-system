import test from "node:test";
import assert from "node:assert/strict";

import templateEngineApi from "../../src/engine/index.js";

test("new contributor can follow README first render end-to-end", async () => {
	const templateEngine = templateEngineApi["create-template-engine"]({
		templateRootDirectoryPath: "./tests/fixtures/templates"
	});

	const outputHtml = await templateEngineApi["render-template-file"](
		templateEngine,
		"pages/index.page.html",
		{
			page: {
				title: "Home",
				file: "/",
				navigation: [
					{ file: "/", title: "Home" },
					{ file: "/contact", title: "Contact" }
				],
				cards: ["One", "Two", "Three"]
			}
		}
	);

	assert.match(outputHtml, /<!doctype html>/i);
	assert.match(outputHtml, /<title>Home<\/title>/);
	assert.match(outputHtml, /aria-current="page">Home<\/a>/);
	assert.match(outputHtml, /<a href="\/contact">Contact<\/a>/);
	assert.match(outputHtml, /<article data-index="0">One<\/article>/);
	assert.match(outputHtml, /<article data-index="1">Two<\/article>/);
	assert.match(outputHtml, /<article data-index="2">Three<\/article>/);
});
