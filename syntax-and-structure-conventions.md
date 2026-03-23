# Syntax and Structure Conventions (Canonical v2.0.1)

This is the canonical conventions reference for template syntax and project structure.

## Naming Conventions

- use lowercase, descriptive, hyphen-separated file and directory names
- avoid unnecessary abbreviations in names
- prefer fully spelled-out words for public files and exported artifacts
- allow common conventional root directories (`src`, `app`, `dist`, `build`)

**Examples:**

- `menu-button.js`
- `navigation-bar.css`
- **Layouts/Bases:**
	- `default.layout.html`
	- `alternative.layout.html`
- **Web Page Templates:**
	- `index.page.html`
	- `contact.page.html`
	- `services.page.html`
	- `gallery.page.html`
- **Partial/Includes:**
	- `site-head.partial.html`
	- `site-header.partial.html`
	- `site-logo-link.partial.html`
	- `site-menu-button.partial.html`
	- `site-navigation.partial.html`
	- `site-footer.partial.html`
	- `site-javascript.partial.html`
	- `color-scheme-switch.partial.html`
	- `image-gallery.partial.html`
	- `contact-form.partial.html`
- **Functions/Macros:**
	- `navigation-menu-item.function.html`
	- `svg-icon.function.html`
	- `toggle-button.function.html`

## Repository Structure (Proposed)

```text
./src/
	./templates/
		./functions/
		./layouts/
		./pages/
		./partials/
	./engine/
		./create-template-engine.js
		./render-template.js
		./render-template-file.js
		./register-partial.js
		./register-helper.js
./tests/
	./fixtures/
	./unit/
	./integration/
./dist/
```

## Template File Naming Policy

- base layout: `*.layout.html`
- page templates: `*.page.html`
- partial includes: `*.partial.html`
- macro/function templates: `*.function.html`
- test fixtures may mirror production names and append `.fixture` if needed

**Examples:**

- `about-us.page.html`
- `site-footer.partial.html`
- `site-navigation.partial.html`
- `site-javascript.partial.html`
- `color-scheme-switch.partial.html`
- `image-gallery.partial.html`
- `contact-form.partial.html`
- `nested-loop-output.fixture.html`
- `navigation-menu-item.function.html`
- `svg-icon.function.html`

## Include and Partial Naming Rules

- registered partial names should be explicit and stable
- recommended partial key form: `section-name/component-name`
- avoid ambiguous short names such as `header` when multiple headers exist

**Examples:**

- `marketing/site-header`
- `dashboard/user-summary-card`

## Template Syntax Conventions

- escaped interpolation by default: `{{ user.name }}`
- raw interpolation only when explicitly needed: `{{{ trustedHtml }}}`
- setting variables: `{% set VARIABLE = VALUE %}`
	- example: `{% set foo = "bar" %}`
- conditionals:
	- `{% if CONDITION %} ... {% end if %}`
	- `{% if CONDITION %} ... {% else %} ... {% end if %}`
	- `{% if CONDITION %} ... {% else if CONDITION %} ... {% else %} ... {% end if %}`
- loops:
	- `{% for OBJECT in OBJECTS %} ... {% end for %}`
- partial include:
	- `{% include "../partials/site-header.partial.html" %}`
- comments:
	- `{# this is ignored #}`
- extending layouts:
	- `{% extends "../layouts/default.layout.html" %}`
	- `{% block main %}...{% endblock main %}`
- function invocation:
	- interpolation: `{{ fn("navigation-menu-item.function.html", { item: pageItem }) }}`
	- directive: `{% function "navigation-menu-item.function.html" with { item: pageItem } %}`

## JavaScript and Formatting Conventions

- use modern JavaScript (ES6+)
- tabs for indentation
- treat one tab as width 2
- prefer ASCII unless an existing file requires Unicode
- avoid third-party packages unless required and justified
- prefer Node.js built-in modules where practical

## Documentation Consistency Rules

- API names in docs must exactly match the specification contract
- terminology terms (Template, Page, Partial, Context, Render Pass, Function/Macro, Layout, Helper/Filter) must use consistent definitions
- examples in README must only use supported syntax from the specification
- `./syntax-and-structure-conventions--updated-v2.md` is retained as historical/reference material
