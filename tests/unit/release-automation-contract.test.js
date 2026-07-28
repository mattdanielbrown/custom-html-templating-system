import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readRepositoryFile = (relativeFilePath) =>
	readFile(new URL(`../../${relativeFilePath}`, import.meta.url), "utf8");

test("package metadata guards public provenance releases", async () => {
	const packageMetadata = JSON.parse(await readRepositoryFile("package.json"));

	assert.equal(packageMetadata.engines.node, ">=22");
	assert.equal(packageMetadata.type, "module");
	assert.equal(packageMetadata.exports, "./src/engine/index.js");
	assert.equal(packageMetadata.publishConfig.access, "public");
	assert.equal(packageMetadata.publishConfig.provenance, true);
	assert.equal(packageMetadata.publishConfig.registry, "https://registry.npmjs.org/");
	assert.equal(packageMetadata.scripts.prepublishOnly, "npm test && npm run verify-package");
	assert.equal(packageMetadata.scripts["verify-release"], "node scripts/verify-release.js");
});

test("npm publication uses the guarded GitHub Release workflow", async () => {
	const workflowSource = await readRepositoryFile(
		".github/workflows/publish-npm-package.yml"
	);

	assert.match(workflowSource, /^on:\n {2}release:\n {4}types:\n {6}- published$/m);
	assert.match(workflowSource, /^ {4}if: \$\{\{ !github\.event\.release\.prerelease \}\}$/m);
	assert.match(workflowSource, /^ {4}runs-on: ubuntu-latest$/m);
	assert.match(workflowSource, /^ {4}environment: npm$/m);
	assert.match(workflowSource, /^ {6}id-token: write$/m);
	assert.match(workflowSource, /actions\/checkout@[a-f0-9]{40} # v6/);
	assert.match(workflowSource, /actions\/setup-node@[a-f0-9]{40} # v6/);
	assert.match(workflowSource, /^ {10}node-version: "22\.14\.0"$/m);
	assert.match(workflowSource, /^ {8}run: npm ci$/m);
	assert.match(
		workflowSource,
		/npm run verify-release -- "\$\{\{ github\.event\.release\.tag_name \}\}"/
	);
	assert.match(workflowSource, /^ {8}run: npm test$/m);
	assert.match(workflowSource, /^ {8}run: npm run verify-package$/m);
	assert.match(
		workflowSource,
		/^ {8}run: npm publish --provenance --access public$/m
	);
	assert.match(
		workflowSource,
		/^ {10}NODE_AUTH_TOKEN: \$\{\{ secrets\.NPM_TOKEN \}\}$/m
	);
});
