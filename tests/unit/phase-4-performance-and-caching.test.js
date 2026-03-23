import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createTemplateEngine } from "../../src/engine/create-template-engine.js";
import { renderTemplate } from "../../src/engine/render-template.js";
import { renderTemplateFile } from "../../src/engine/render-template-file.js";

test("template parse cache can be enabled and disabled", () => {
	const templateString = "<p>{{ page.title }}</p>";

	const withoutCacheEngine = createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates",
		enableTemplateParseCache: false
	});
	renderTemplate(withoutCacheEngine, templateString, { page: { title: "One" } });
	renderTemplate(withoutCacheEngine, templateString, { page: { title: "Two" } });
	assert.equal(withoutCacheEngine.templateParseCacheBySource.size, 0);

	const withCacheEngine = createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates",
		enableTemplateParseCache: true
	});
	renderTemplate(withCacheEngine, templateString, { page: { title: "One" } });
	renderTemplate(withCacheEngine, templateString, { page: { title: "Two" } });
	assert.equal(withCacheEngine.templateParseCacheBySource.size, 1);
});

test("file cache invalidation behaves deterministically", async () => {
	const temporaryRootDirectoryPath = await mkdtemp(join(tmpdir(), "html-template-engine-cache-"));
	await mkdir(join(temporaryRootDirectoryPath, "pages"), { recursive: true });
	const pageTemplatePath = join(temporaryRootDirectoryPath, "pages", "index.page.html");

	await writeFile(pageTemplatePath, "<p>{{ page.title }}</p>", "utf8");
	const templateEngine = createTemplateEngine({
		templateRootDirectoryPath: temporaryRootDirectoryPath,
		enableTemplateFileCache: true
	});

	const firstOutputHtml = await renderTemplateFile(templateEngine, "pages/index.page.html", {
		page: { title: "Alpha" }
	});
	assert.equal(firstOutputHtml, "<p>Alpha</p>");

	await new Promise((resolvePromise) => setTimeout(resolvePromise, 25));
	await writeFile(pageTemplatePath, "<p>{{ page.title }} Updated</p>", "utf8");

	const secondOutputHtml = await renderTemplateFile(templateEngine, "pages/index.page.html", {
		page: { title: "Beta" }
	});
	assert.equal(secondOutputHtml, "<p>Beta Updated</p>");
});

test("cached and uncached output is identical for same input", async () => {
	const contextData = {
		page: {
			title: "Index",
			file: "/",
			navigation: [
				{ file: "/", title: "Home" },
				{ file: "/contact", title: "Contact" }
			],
			cards: ["First", "Second"]
		}
	};

	const uncachedEngine = createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates",
		enableTemplateParseCache: false,
		enableTemplateFileCache: false
	});
	const cachedEngine = createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates",
		enableTemplateParseCache: true,
		enableTemplateFileCache: true
	});

	const uncachedOutputHtml = await renderTemplateFile(uncachedEngine, "pages/index.page.html", contextData);
	const cachedOutputHtml = await renderTemplateFile(cachedEngine, "pages/index.page.html", contextData);

	assert.equal(cachedOutputHtml, uncachedOutputHtml);
});
