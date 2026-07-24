import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const executeFile = promisify(execFile);
const repositoryRootDirectoryPath = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporaryDirectoryPath = await mkdtemp(join(tmpdir(), "html-template-engine-verify-"));
const allowedTopLevelPaths = new Set([
	"CHANGELOG.md",
	"README.md",
	"package.json",
	"roadmap.md",
	"src",
	"syntax-and-structure-conventions.md",
	"templating-engine-specification.md"
]);

const { stdout } = await executeFile(
	"npm",
	["pack", "--dry-run", "--json"],
	{
		cwd: repositoryRootDirectoryPath,
		env: { ...process.env, npm_config_cache: join(temporaryDirectoryPath, "npm-cache") }
	}
);
const [packResult] = JSON.parse(stdout);
const packedFilePaths = packResult.files.map((packedFile) => packedFile.path);

assert.ok(packedFilePaths.includes("package.json"), "Package metadata is missing from the tarball.");
assert.ok(packedFilePaths.includes("src/engine/index.js"), "Package entrypoint is missing from the tarball.");
assert.ok(packedFilePaths.includes("README.md"), "README is missing from the tarball.");

for (const packedFilePath of packedFilePaths) {
	const [topLevelPath] = packedFilePath.split("/");
	assert.ok(
		allowedTopLevelPaths.has(topLevelPath),
		`Unexpected package file: ${packedFilePath}`
	);
}

console.log(`Verified ${packedFilePaths.length} package files.`);
