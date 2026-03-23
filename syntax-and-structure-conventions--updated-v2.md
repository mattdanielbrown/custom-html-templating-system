# Syntax and Structure Conventions — UPDATED v2.0.1

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

---

## Repository Structure (Proposed)

```text
./src/
	./templates/
		<!-- SEE BELOW -->
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

**Contents of `./src/templates/` directory (from above)**:
```
(src/)
├─ (templates/) [ STARTING HERE ]
│  ├─ functions/
│  │  ├─ navigation-menu-item.function.html
│  │  ├─ svg-icon.funciton.html
│  │  └─ toggle-action.funciton.html
│  ├─ layouts/
│  │  ├─ alternative.layout.html
│  │  └─ default.layout.html
│  ├─ pages/
│  │  ├─ contact.page.html
│  │  ├─ gallery.page.html
│  │  ├─ index.page.html
│  │  └─ services.page.html
│  ├─ partials/
│  │  ├─ contact-form.partial.html
│  │  ├─ gallery.partial.html
│  │  ├─ site-footer.partial.html
│  │  ├─ site-head.partial.html
│  │  ├─ site-header.partial.html
│  │  ├─ site-javascript.partial.html
│  │  ├─ site-logo-link.partial.html
└──┴──┴─ site-navigation.partial.html

```


---

## Template File Naming Policy

- **base layout:** `*.layout.html`
- **page templates:** `*.page.html`
- **partial includes:** `*.partial.html`
- **macro functions:** `*.function.html`
- test fixtures may mirror production names and append `.fixture` if needed

**Examples:**

- `about-us.page.html`
- `site-footer.partial.html`
- `site-navigation.partial.html`
- `site-footer.partial.html`
- `site-javascript.partial.html`
- `color-scheme-switch.partial.html`
- `image-gallery.partial.html`
- `contact-form.partial.html`
- `nested-loop-output.fixture.html`
- `navigation-menu-item.function.html`
- `svg-icon.function.html`

---

## Include and Partial Naming Rules

- registered partial names should be explicit and stable
- recommended partial key form: `section-name/component-name`
- avoid ambiguous short names such as `header` when multiple headers exist

**Examples:**

- `marketing/site-header`
- `dashboard/user-summary-card`

---

## Template Syntax Conventions

- escaped interpolation by default: `{{ user.name }}`
- raw interpolation only when explicitly needed: `{{{ trustedHtml }}}`
- **setting variables:** `{% set VARIABLE = VALUE %}`     
  Example:
  ```django
  {% set foo = "bar" %}
  ```
- **conditionals:** 
    - `{% if CONDITION %} ... {% end if %}`
    - `{% if CONDITION %} ... {% else %} ... {% end if %}`
    - `{% if CONDITION %} ... {% else if CONDITION %} ... {% else %} ... {% end if %}`
    - Example:
      ```django
      {% if thisIndex === page.index %}
        <a href="{{page.filename}}" aria-current="page">{{page.title}}</a>
      {% else %}
        <a href="{{page.filename}}">{{page.title}}</a>
      {% end if %}
      ```
- **loops:** `{% for OBJECT in OBJECTS %} ... {% end for %}`   
  Example:
  ```django
  <nav id="primary-navigation">
	<ul class="navigation-menu" id="navigation-menu">
		{% set i = 0 %}
		{% for pageItem in pageData %}
			{% if i === pageItem.index %}
				<li><a href="{{ pageItem.file }}" aria-current="page">{{ pageItem.title }}</a></li>
			{% else %}
				<li><a href="{{ pageItem.file }}">{{ pageItem.title }}</a></li>
			{% end if %}
			{% set i++ %} {# Equivalent to `set i = i+1` #}
		{% end for %}
	</ul>
  </nav>
  ```
- **partial include:** `{% include "PARTIAL" %}`   
  Example:   
  ```django
  {% include "../partials/site-header.partial.html" %}
  ```
- **comments:** `{# IGNORED COMMENT #}`   
  Example:
  ```django
  {# this is ignored #}
  ```
- **extending layouts:** `{% extends "LAYOUT" %} ... {% block BLOCK %}...{% endblock BLOCK %}`   
  Example:   
  ```django
  {% extends "../layouts/default.layout.html" %}
  
  {% block main %}
    {# Page Content Goes Here... #}
  {% endblock main %}
  ```

---

## JavaScript and Formatting Conventions

- use modern JavaScript (ES6+)
- tabs for indentation
- treat one tab as width 2
- prefer ASCII unless an existing file requires Unicode
- avoid third-party packages unless required and justified
- prefer Node.js built-in modules where practical

---

## Documentation Consistency Rules

- API names in docs must exactly match the specification contract
- terminology terms (Template, Page, Partial, Context, Render Pass, Function/Macro, Layout, Helper/Filter) must use consistent definitions
- examples in README must only use supported syntax from the specification
