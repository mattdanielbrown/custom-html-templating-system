# html-template-engine

[![status](https://img.shields.io/badge/status-v2.2.0--development-orange)](./roadmap.md)

A Node.js-first HTML templating engine with v2 directive syntax, layout inheritance, and deterministic rendering.

## Current Status
- v2 parser and renderer are implemented for the documented syntax
- helpers, caching, and function templates are implemented and test-covered
- v2.2.0 adds an installable, dependency-free ESM package contract

## Quickstart (v2 Syntax)

### Install
Requires Node.js 22 or newer.

Install the package when it is available from your configured npm registry:

```sh
npm install @mattdanielbrown/html-template-engine
```

For local development from a clean clone:

```sh
npm install
npm test
npm run verify-package
```

To install the unpublished package into a separate local project:

```sh
mkdir -p /tmp/html-template-engine-package
npm pack --pack-destination /tmp/html-template-engine-package
cd /path/to/consumer-project
npm install /tmp/html-template-engine-package/mattdanielbrown-html-template-engine-2.2.0.tgz
```

The generated tarball exercises the same package boundary used by the clean-install integration test.

The package is ESM-only and exposes its public API from the package root.

### First Template (`*.page.html`)
```django
{% extends "../layouts/default.layout.html" %}

{% block main %}
	<section>
		{% set i = 0 %}
		{% for pageItem in pageData %}
			{% if i === pageItem.index %}
				<a href="{{ pageItem.file }}" aria-current="page">{{ pageItem.title }}</a>
			{% else %}
				<a href="{{ pageItem.file }}">{{ pageItem.title }}</a>
			{% end if %}
			{% set i++ %}
		{% end for %}
	</section>
{% endblock main %}
```

### First Render
```js
import templateEngineApi from "@mattdanielbrown/html-template-engine";

const templateEngine = templateEngineApi["create-template-engine"]({
	templateRootDirectoryPath: "./src/templates"
});

const outputHtml = await templateEngineApi["render-template-file"](
	templateEngine,
	"pages/index.page.html",
	{
		page: {
			title: "Home",
			file: "/",
			navigation: [
				{ file: "/", title: "Home" },
				{ file: "/contact", title: "Contact" }
			],
			cards: ["One", "Two", "Three"]
		}
	}
);

console.log(outputHtml);
```

## Stable Public API (Current Contract)
- `create-template-engine(options)`
- `render-template(template-string, context-data, options?)`
- `render-template-file(template-file-path, context-data, options?)`
- `register-partial(name, template-string-or-path)`
- `register-helper(name, helper-function)`

See full details in `./templating-engine-specification.md`.

## v2 Syntax Summary
- escaped interpolation: `{{ value.path }}`
- raw interpolation: `{{{ trustedHtml }}}`
- comments: `{# ignored #}`
- variable set/increment: `{% set foo = "bar" %}`, `{% set i++ %}`
- conditionals: `{% if ... %}`, `{% else if ... %}`, `{% else %}`, `{% end if %}`
- loops: `{% for item in items %} ... {% end for %}`
- includes: `{% include "../partials/site-header.partial.html" %}`
- layout inheritance: `{% extends "../layouts/default.layout.html" %}` and `{% block main %}...{% endblock main %}`
- function templates:
	- interpolation call: `{{ fn("navigation-menu-item.function.html", { item: pageItem }) }}`
	- directive call: `{% function "navigation-menu-item.function.html" with { item: pageItem } %}`

## Template File Naming Policy (v2)
- layouts: `*.layout.html`
- pages: `*.page.html`
- partials: `*.partial.html`
- functions/macros: `*.function.html`

Function-template runtime for `*.function.html` files is implemented for both invocation forms: `{{ fn("name.function.html", { ... }) }}` and `{% function "name.function.html" with { ... } %}`.

## Documentation Map
- Project overview: `./overview.md`
- Engine specification: `./templating-engine-specification.md`
- Development roadmap: `./roadmap.md`
- Canonical syntax and structure conventions: `./syntax-and-structure-conventions.md`
- Historical v2 draft/reference: `./syntax-and-structure-conventions--updated-v2.md`

## Shared Terminology
- **Template**: any template document rendered by the engine.
- **Page**: a top-level template, typically under `pages/`, often extending a layout.
- **Layout**: a base template that defines blocks to be overridden by pages.
- **Partial**: a reusable include template, typically under `partials/`.
- **Function/Macro**: function-style template artifact (file naming convention `*.function.html`).
- **Context**: structured data passed into a render call.
- **Render Pass**: one complete parse/evaluate/output cycle.
- **Helper/Filter**: registered JavaScript functions used by the engine API.
