import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const executeFile = promisify(execFile);
const repositoryRootDirectoryPath = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("packed package installs cleanly and exposes only its root API", async (testContext) => {
	const temporaryDirectoryPath = await mkdtemp(join(tmpdir(), "html-template-engine-package-"));
	testContext.after(() => rm(temporaryDirectoryPath, { recursive: true, force: true }));
	const packageDirectoryPath = join(temporaryDirectoryPath, "package");
	const consumerDirectoryPath = join(temporaryDirectoryPath, "consumer");
	const npmCacheDirectoryPath = join(temporaryDirectoryPath, "npm-cache");
	await Promise.all([
		mkdir(packageDirectoryPath),
		mkdir(join(consumerDirectoryPath, "templates", "layouts"), { recursive: true }),
		mkdir(join(consumerDirectoryPath, "templates", "pages"), { recursive: true }),
		mkdir(join(consumerDirectoryPath, "templates", "partials"), { recursive: true })
	]);

	const { stdout: packOutput } = await executeFile(
		"npm",
		["pack", "--json", "--pack-destination", packageDirectoryPath],
		{
			cwd: repositoryRootDirectoryPath,
			env: { ...process.env, npm_config_cache: npmCacheDirectoryPath }
		}
	);
	const [packResult] = JSON.parse(packOutput);
	const packedFilePaths = packResult.files.map((packedFile) => packedFile.path).sort();
	const requiredRootFilePaths = [
		"CHANGELOG.md",
		"README.md",
		"package.json",
		"roadmap.md",
		"syntax-and-structure-conventions.md",
		"templating-engine-specification.md"
	];

	assert.ok(packedFilePaths.includes("src/engine/index.js"));
	for (const requiredRootFilePath of requiredRootFilePaths) {
		assert.ok(packedFilePaths.includes(requiredRootFilePath));
	}
	assert.ok(packedFilePaths.every((packedFilePath) =>
		requiredRootFilePaths.includes(packedFilePath) ||
		packedFilePath.startsWith("src/engine/")
	));

	const tarballFilePath = join(packageDirectoryPath, packResult.filename);
	await writeFile(
		join(consumerDirectoryPath, "package.json"),
		JSON.stringify({ name: "package-contract-consumer", private: true, type: "module" }, null, 2)
	);
	await writeFile(
		join(consumerDirectoryPath, "templates", "layouts", "default.layout.html"),
		"<main>{% include \"../partials/header.partial.html\" %}{% block content %}{% endblock content %}</main>"
	);
	await writeFile(
		join(consumerDirectoryPath, "templates", "partials", "header.partial.html"),
		"<h1>{{ page.title }}</h1>"
	);
	await writeFile(
		join(consumerDirectoryPath, "templates", "pages", "index.page.html"),
		"{% extends \"../layouts/default.layout.html\" %}{% block content %}<p>{{ page.message }}</p>{% endblock content %}"
	);

	await executeFile(
		"npm",
		["install", "--ignore-scripts", "--no-audit", "--no-fund", tarballFilePath],
		{
			cwd: consumerDirectoryPath,
			env: { ...process.env, npm_config_cache: npmCacheDirectoryPath }
		}
	);

	const smokeTestSource = `
		import templateEngineApi, {
			createTemplateEngine,
			renderTemplate,
			renderTemplateFile
		} from "html-template-engine";

		const inlineEngine = createTemplateEngine({ templateRootDirectoryPath: "./templates" });
		const inlineOutput = renderTemplate(inlineEngine, "<p>{{ value }}</p>", {
			value: "<safe>"
		});
		if (inlineOutput !== "<p>&lt;safe&gt;</p>") {
			throw new Error(\`Unexpected inline output: \${inlineOutput}\`);
		}
		if (typeof templateEngineApi["register-helper"] !== "function") {
			throw new Error("Default API is missing register-helper.");
		}

		const fileEngine = createTemplateEngine({ templateRootDirectoryPath: "./templates" });
		const fileOutput = await renderTemplateFile(fileEngine, "pages/index.page.html", {
			page: { title: "Installed", message: "Ready" }
		});
		if (fileOutput !== "<main><h1>Installed</h1><p>Ready</p></main>") {
			throw new Error(\`Unexpected file output: \${fileOutput}\`);
		}

		try {
			await import("html-template-engine/src/engine/render-template.js");
			throw new Error("Internal package subpath unexpectedly resolved.");
		} catch (error) {
			if (error.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") {
				throw error;
			}
		}
	`;
	await writeFile(join(consumerDirectoryPath, "smoke-test.js"), smokeTestSource);
	await executeFile(process.execPath, ["smoke-test.js"], { cwd: consumerDirectoryPath });

	const installedPackageMetadata = JSON.parse(
		await readFile(
			join(consumerDirectoryPath, "node_modules", "html-template-engine", "package.json"),
			"utf8"
		)
	);
	assert.equal(installedPackageMetadata.version, "2.2.0");
});
