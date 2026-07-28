import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRootDirectoryPath = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const readRepositoryFile = (relativeFilePath) =>
	readFile(resolve(repositoryRootDirectoryPath, relativeFilePath), "utf8");

test("README documents the installable package contract", async () => {
	const [packageMetadataSource, readmeSource] = await Promise.all([
		readRepositoryFile("package.json"),
		readRepositoryFile("README.md")
	]);
	const packageMetadata = JSON.parse(packageMetadataSource);

	assert.match(readmeSource, new RegExp(`npm install ${packageMetadata.name}`));
	assert.match(readmeSource, new RegExp(`from "${packageMetadata.name}"`));
	assert.match(readmeSource, /npm pack --pack-destination/);
	assert.match(
		readmeSource,
		/npm install \/tmp\/html-template-engine-package\/mattdanielbrown-html-template-engine-2\.2\.0\.tgz/
	);
	assert.match(readmeSource, /npm test/);
	assert.doesNotMatch(readmeSource, /Package publishing metadata is not configured yet/);

	for (const publicApiName of [
		"create-template-engine",
		"render-template",
		"render-template-file",
		"register-partial",
		"register-helper"
	]) {
		assert.match(readmeSource, new RegExp(`\`${publicApiName}`));
	}
});

test("README internal Markdown links resolve to repository files", async () => {
	const readmeSource = await readRepositoryFile("README.md");
	const relativeMarkdownLinks = [...readmeSource.matchAll(/\]\((\.\/[^)#]+\.md)(?:#[^)]+)?\)/g)]
		.map((match) => match[1]);

	assert.ok(relativeMarkdownLinks.length > 0);
	await Promise.all(
		relativeMarkdownLinks.map((relativeLink) =>
			access(resolve(repositoryRootDirectoryPath, relativeLink))
		)
	);
});
