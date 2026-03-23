import test from "node:test";
import assert from "node:assert/strict";

import templateEngineApi from "../../src/engine/index.js";

test("public API exposes documented stable v1 methods", () => {
	assert.equal(typeof templateEngineApi["create-template-engine"], "function");
	assert.equal(typeof templateEngineApi["render-template"], "function");
	assert.equal(typeof templateEngineApi["render-template-file"], "function");
	assert.equal(typeof templateEngineApi["register-partial"], "function");
	assert.equal(typeof templateEngineApi["register-helper"], "function");
});
