import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import templateEngineApi, {
	createTemplateEngine,
	registerHelper,
	registerPartial,
	renderTemplate,
	renderTemplateFile
} from "../../src/engine/index.js";

const packageMetadata = JSON.parse(
	await readFile(new URL("../../package.json", import.meta.url), "utf8")
);

test("package metadata defines the v2.2.0 ESM root contract", () => {
	assert.equal(packageMetadata.name, "@mattdanielbrown/html-template-engine");
	assert.equal(packageMetadata.version, "2.2.0");
	assert.equal(packageMetadata.type, "module");
	assert.equal(packageMetadata.main, "./src/engine/index.js");
	assert.equal(packageMetadata.exports, "./src/engine/index.js");
	assert.equal(packageMetadata.engines.node, ">=22");
	assert.equal(
		packageMetadata.repository.url,
		"git+https://github.com/mattdanielbrown/custom-html-templating-system.git"
	);
	assert.equal(packageMetadata.scripts.test, "node --test");
	assert.equal(packageMetadata.scripts.prepublishOnly, "npm test && npm run verify-package");
	assert.equal(packageMetadata.scripts["verify-package"], "node scripts/verify-package.js");
	assert.equal(packageMetadata.scripts["verify-release"], "node scripts/verify-release.js");
	assert.deepEqual(packageMetadata.dependencies ?? {}, {});
	assert.deepEqual(packageMetadata.devDependencies ?? {}, {});
});

test("package root preserves the documented default and named APIs", () => {
	assert.equal(typeof templateEngineApi["create-template-engine"], "function");
	assert.equal(typeof templateEngineApi["render-template"], "function");
	assert.equal(typeof templateEngineApi["render-template-file"], "function");
	assert.equal(typeof templateEngineApi["register-partial"], "function");
	assert.equal(typeof templateEngineApi["register-helper"], "function");
	assert.equal(typeof createTemplateEngine, "function");
	assert.equal(typeof renderTemplate, "function");
	assert.equal(typeof renderTemplateFile, "function");
	assert.equal(typeof registerPartial, "function");
	assert.equal(typeof registerHelper, "function");
});
