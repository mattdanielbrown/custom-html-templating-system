import test from "node:test";
import assert from "node:assert/strict";

import { createTemplateEngine } from "../../src/engine/create-template-engine.js";
import { renderTemplate } from "../../src/engine/render-template.js";
import { renderTemplateFile } from "../../src/engine/render-template-file.js";

test("package baseline preserves invalid engine argument failures", async () => {
	assert.throws(
		() => renderTemplate(null, "<p>Invalid</p>"),
		{
			name: "TypeError",
			message: "A valid template engine instance is required."
		}
	);

	await assert.rejects(
		() => renderTemplateFile(null, "pages/index.page.html"),
		{
			name: "TypeError",
			message: "A valid template engine instance is required."
		}
	);
});

test("package baseline preserves missing template file failures", async () => {
	const templateEngine = createTemplateEngine({
		templateRootDirectoryPath: "./tests/fixtures/templates"
	});

	await assert.rejects(
		() => renderTemplateFile(templateEngine, "pages/does-not-exist.page.html"),
		(error) => {
			assert.equal(error.code, "ENOENT");
			return true;
		}
	);
});
