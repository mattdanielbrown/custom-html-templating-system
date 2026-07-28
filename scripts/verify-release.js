import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [releaseTagName] = process.argv.slice(2);
const packageMetadata = JSON.parse(
	await readFile(new URL("../package.json", import.meta.url), "utf8")
);
const expectedReleaseTagName = `v${packageMetadata.version}`;

assert.ok(releaseTagName, "A release tag name is required.");
assert.equal(
	releaseTagName,
	expectedReleaseTagName,
	`Release tag ${releaseTagName} does not match package version ${packageMetadata.version}.`
);

if (process.env.GITHUB_ACTIONS === "true") {
	assert.equal(
		process.env.GITHUB_EVENT_NAME,
		"release",
		"Package releases must run from a GitHub Release event."
	);
	assert.equal(process.env.GITHUB_REF_TYPE, "tag", "Package releases must run from a tag.");
	assert.equal(
		process.env.GITHUB_REF_NAME,
		releaseTagName,
		"The checked-out Git tag does not match the release tag."
	);

	const expectedRepositoryUrl =
		`git+https://github.com/${process.env.GITHUB_REPOSITORY}.git`;
	assert.equal(
		packageMetadata.repository?.url,
		expectedRepositoryUrl,
		"package.json repository metadata does not match the publishing repository."
	);
}

console.log(`Verified release contract for ${packageMetadata.name}@${packageMetadata.version}.`);
