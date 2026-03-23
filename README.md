# html-template-engine

[![status](https://img.shields.io/badge/status-v2.0.1-blue)](./roadmap.md)

A Node.js-first HTML templating engine with v2 directive syntax, layout inheritance, and deterministic rendering.

## Current Status
- v2 parser and renderer are implemented for core syntax
- docs and tests now target v2 conventions
- roadmap TODO tests remain for later phases (helpers/caching hardening)

## Quickstart (v2 Syntax)

### Install
This repository is currently local-source driven. Package publishing metadata is not configured yet.

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
import templateEngineApi from "html-template-engine";

const templateEngine = templateEngineApi["create-template-engine"]({
	templateRootDirectoryPath: "./src/templates"
});

const outputHtml = await templateEngineApi["render-template-file"](
	templateEngine,
	"pages/index.page.html",
	{
		pageData: [
			{ index: 0, file: "/", title: "Home" },
			{ index: 1, file: "/contact", title: "Contact" }
		]
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

## Template File Naming Policy (v2)
- layouts: `*.layout.html`
- pages: `*.page.html`
- partials: `*.partial.html`
- functions/macros: `*.function.html`

Function-template runtime for `*.function.html` files is scaffolded but not integrated into main template rendering yet.

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
