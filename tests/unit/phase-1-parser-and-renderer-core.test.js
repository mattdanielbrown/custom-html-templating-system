import test from "node:test";
import assert from "node:assert/strict";

import { createTemplateEngine } from "../../src/engine/create-template-engine.js";
import { renderTemplate } from "../../src/engine/render-template.js";

function createEngine(options = {}) {
	return createTemplateEngine({
		templateRootDirectoryPath: "./src/templates",
		...options
	});
}

test("escaped interpolation: {{ variablePath }}", () => {
	const templateEngine = createEngine();
	const outputHtml = renderTemplate(
		templateEngine,
		"<p>{{ user.name }}</p><span>{{ user.bio }}</span>",
		{
			user: {
				name: "Matt <Brown>",
				bio: "R&D & Platform"
			}
		}
	);

	assert.equal(outputHtml, "<p>Matt &lt;Brown&gt;</p><span>R&amp;D &amp; Platform</span>");
});

test("raw interpolation: {{{ variablePath }}}", () => {
	const templateEngine = createEngine();
	const outputHtml = renderTemplate(
		templateEngine,
		"<section>{{{ trustedHtml }}}</section>",
		{
			trustedHtml: "<strong>Allowed</strong>"
		}
	);

	assert.equal(outputHtml, "<section><strong>Allowed</strong></section>");
});

test("if blocks with optional else branch", () => {
	const templateEngine = createEngine();
	const templateString = "{{#if user.isSignedIn}}<p>Welcome {{ user.name }}</p>{{else}}<p>Please sign in</p>{{/if}}";

	const signedInOutput = renderTemplate(templateEngine, templateString, {
		user: {
			isSignedIn: true,
			name: "Matt"
		}
	});
	const signedOutOutput = renderTemplate(templateEngine, templateString, {
		user: {
			isSignedIn: false,
			name: "Matt"
		}
	});

	assert.equal(signedInOutput, "<p>Welcome Matt</p>");
	assert.equal(signedOutOutput, "<p>Please sign in</p>");
});

test("each blocks with item and optional index binding", () => {
	const templateEngine = createEngine();
	const templateString = "<ul>{{#each items as item, index}}<li>{{ index }}:{{ item }}</li>{{/each}}</ul>";
	const outputHtml = renderTemplate(templateEngine, templateString, {
		items: ["A", "B", "C"]
	});

	assert.equal(outputHtml, "<ul><li>0:A</li><li>1:B</li><li>2:C</li></ul>");
});

test("comments do not appear in output", () => {
	const templateEngine = createEngine();
	const outputHtml = renderTemplate(
		templateEngine,
		"<main>{{! this should be ignored }}<p>{{ title }}</p></main>",
		{ title: "Home" }
	);

	assert.equal(outputHtml, "<main><p>Home</p></main>");
});

test("deterministic scope and evaluation order", () => {
	const templateEngine = createEngine();
	const templateString = [
		"{{#each sections as section, sectionIndex}}",
		"<section data-index=\"{{ sectionIndex }}\">",
		"{{#if section.enabled}}",
		"<h2>{{ section.title }}</h2>",
		"<ol>{{#each section.items as item, itemIndex}}<li>{{ sectionIndex }}-{{ itemIndex }}:{{ item }}</li>{{/each}}</ol>",
		"{{/if}}",
		"</section>",
		"{{/each}}"
	].join("");

	const outputHtml = renderTemplate(templateEngine, templateString, {
		sections: [
			{ enabled: true, title: "One", items: ["A", "B"] },
			{ enabled: true, title: "Two", items: ["C"] }
		]
	});

	assert.equal(
		outputHtml,
		"<section data-index=\"0\"><h2>One</h2><ol><li>0-0:A</li><li>0-1:B</li></ol></section><section data-index=\"1\"><h2>Two</h2><ol><li>1-0:C</li></ol></section>"
	);
});

test("parse and render errors follow canonical shape", () => {
	const templateEngine = createEngine({ strictMissingKeyErrors: true });

	assert.throws(
		() => {
			renderTemplate(templateEngine, "{{#if user.name}}<p>{{ user.name }}</p>", {
				user: { name: "Matt" }
			}, {
				templateFilePath: "./tests/fixtures/unclosed.template.html"
			});
		},
		(error) => {
			assert.equal(error.errorName, "TemplateParseError");
			assert.equal(error.name, "TemplateParseError");
			assert.equal(error.code, "TEMPLATE_PARSE_UNCLOSED_BLOCK");
			assert.equal(error.templateFilePath, "./tests/fixtures/unclosed.template.html");
			assert.equal(typeof error.message, "string");
			assert.equal(typeof error.line, "number");
			assert.equal(typeof error.column, "number");
			assert.ok("snippet" in error);
			assert.ok("cause" in error);
			return true;
		}
	);

	assert.throws(
		() => {
			renderTemplate(templateEngine, "<p>{{ user.name }}</p>", {}, {
				templateFilePath: "./tests/fixtures/missing-key.template.html"
			});
		},
		(error) => {
			assert.equal(error.errorName, "TemplateRenderError");
			assert.equal(error.name, "TemplateRenderError");
			assert.equal(error.code, "TEMPLATE_RENDER_MISSING_KEY");
			assert.equal(error.templateFilePath, "./tests/fixtures/missing-key.template.html");
			assert.equal(typeof error.message, "string");
			assert.equal(typeof error.line, "number");
			assert.equal(typeof error.column, "number");
			assert.equal(typeof error.snippet, "string");
			assert.ok("cause" in error);
			return true;
		}
	);
});
