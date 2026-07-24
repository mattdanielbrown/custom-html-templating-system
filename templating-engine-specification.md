# Templating Engine Specification (v2.2.0)

## 1. Scope and Runtime
- Runtime target: Node.js 22 or newer
- Module format: ECMAScript modules (ESM)
- Package entrypoint: `html-template-engine`
- Template syntax target: v2 directive syntax (`{% ... %}`, `{# ... #}`, `{{ ... }}`)
- Security model: escaped HTML output by default
- Execution model: no arbitrary JavaScript execution from template source

## 2. Public Interface (Stable Contract)

### 2.1 API
- `create-template-engine(options)`
- `render-template(template-string, context-data, options?)`
- `render-template-file(template-file-path, context-data, options?)`
- `register-partial(name, template-string-or-path)`
- `register-helper(name, helper-function)`

The package root also exposes camel-case named exports for JavaScript consumers:
- `createTemplateEngine`
- `renderTemplate`
- `renderTemplateFile`
- `registerPartial`
- `registerHelper`

Internal source file subpaths are not part of the installed package API.

### 2.2 Options
`create-template-engine(options)` supports:
- `templateRootDirectoryPath` (string)
- `partialsDirectoryPath` (string, optional)
- `functionsDirectoryPath` (string, optional; default: `<templateRoot>/functions`)
- `strictMissingKeyErrors` (boolean, default: false)
- `allowRawOutput` (boolean, default: true)
- `enableTemplateParseCache` (boolean, default: false)
- `enableTemplateFileCache` (boolean, default: false)
- `maxFunctionTemplateDepth` (number, default: 25)

### 2.3 Canonical Return Behavior
- `render-template` returns rendered HTML string.
- `render-template-file` resolves path within template root, reads file, and returns rendered HTML string.
- registration methods return the engine instance for chaining.

## 3. File and Directory Conventions (v2)
- layouts: `*.layout.html`
- pages: `*.page.html`
- partials/includes: `*.partial.html`
- macro/function templates: `*.function.html`

Recommended template tree:
```text
./src/templates/
	./functions/
	./layouts/
	./pages/
	./partials/
```

## 4. Syntax

### 4.1 Interpolation
- escaped output: `{{ expression }}`
- raw output: `{{{ expression }}}`

### 4.2 Comments
- comment form: `{# any comment text #}`
- comments are ignored by parser output.

### 4.3 Variables
- assignment: `{% set variableName = expression %}`
- increment/decrement shorthand: `{% set variableName++ %}`, `{% set variableName-- %}`

### 4.4 Conditionals
- if: `{% if CONDITION %} ... {% end if %}`
- if/else: `{% if CONDITION %} ... {% else %} ... {% end if %}`
- else-if chain:
	- `{% if CONDITION_A %} ... {% else if CONDITION_B %} ... {% else %} ... {% end if %}`

Supported condition operators:
- `===`, `!==`, `>`, `<`, `>=`, `<=`
- unary `!`
- string, number, boolean, and null literals

### 4.5 Loops
- for loop: `{% for item in items %} ... {% end for %}`
- optional index binding: `{% for item, index in items %} ... {% end for %}`

Rules:
- loop target must evaluate to an array
- in non-strict mode, non-array loop targets render empty output
- in strict mode, non-array loop targets throw render errors

### 4.6 Includes
- include form: `{% include "RELATIVE_OR_ROOTED_TEMPLATE_PATH" %}`

Rules:
- include path resolves relative to current template file when file-backed
- resolved path must stay inside configured template root
- circular includes are rejected with render errors

### 4.7 Layout Inheritance
- extends form: `{% extends "../layouts/default.layout.html" %}`
- block form: `{% block main %} ... {% endblock main %}`

Rules:
- `extends` must appear at root-level template scope
- page blocks override matching layout blocks by name
- unmatched layout blocks render their default layout content

### 4.8 Function Templates
- interpolation invocation: `{{ fn("name.function.html", { key: value }) }}`
- directive invocation: `{% function "name.function.html" with { key: value } %}`

Rules:
- function templates resolve under functions root (`functionsDirectoryPath` or `<templateRoot>/functions`)
- argument contract is a single object only
- function invocation outputs rendered HTML string
- nested function calls are supported
- recursion and max-depth violations are rejected

## 5. Deterministic Rendering Rules

### 5.1 Evaluation Order
- template parses into an AST in source order
- directives render top-to-bottom, depth-first
- expression operands evaluate left-to-right

### 5.2 Scope and Context Precedence
Lookup precedence:
1. nearest local bindings (`set`, loop variables)
2. parent local bindings
3. current context object
4. parent scope contexts
5. root context

Set behavior:
- `{% set x = ... %}` updates nearest scope where `x` exists, otherwise current scope
- increment/decrement follows the same nearest-scope rule

### 5.3 Escaping
- `{{ ... }}` HTML-escapes (`&`, `<`, `>`, `"`, `'`)
- `{{{ ... }}}` outputs raw content
- non-string values are stringified before output

## 6. Error Model

### 6.1 Error Categories
- **Parse Error**: invalid template syntax/structure
- **Render Error**: runtime evaluation failure

### 6.2 Canonical Error Shape
```js
{
	errorName: "TemplateParseError" | "TemplateRenderError",
	message: "Human-readable failure description",
	code: "TEMPLATE_PARSE_UNEXPECTED_TOKEN",
	templateFilePath: "./src/templates/pages/index.page.html",
	line: 12,
	column: 5,
	snippet: "{% if page.title %}",
	cause: null
}
```

### 6.3 Required Error Cases
- unclosed tags/directives/comments
- mismatched closing directives (`end if`, `end for`, `endblock`)
- invalid `set` / `for` / `if` syntax
- include path escaping template root
- circular include chains
- strict-mode missing key
- strict-mode invalid loop target
- function template not found
- function path outside functions root
- invalid function argument object
- function recursion/depth violations

### 6.4 Function Error Codes
- `TEMPLATE_RENDER_FUNCTION_NOT_FOUND`
- `TEMPLATE_RENDER_FUNCTION_PATH_OUTSIDE_ROOT`
- `TEMPLATE_RENDER_FUNCTION_INVALID_ARGUMENTS`
- `TEMPLATE_RENDER_FUNCTION_RECURSION`
- `TEMPLATE_RENDER_FUNCTION_EXECUTION_FAILED`

## 7. Security Rules
- No `eval`, `Function` constructor, or template-sourced dynamic code execution.
- Path segment resolution blocks `__proto__`, `prototype`, and `constructor`.
- File includes and layout resolution must remain inside template root.
- Raw output is explicit and never default.

## 8. Compatibility Notes
- Legacy v1 block syntax (`{{#if}}`, `{{#each}}`) may still parse for backward compatibility.
- v2 directive syntax is the canonical documented syntax and should be used in all new templates and docs.

## 9. Cross-Document Consistency Targets
- API names must match `./README.md` exactly.
- terminology must align with `./overview.md` and `./syntax-and-structure-conventions.md` (canonical).
- syntax examples in docs must use v2 directive forms.

## 10. Function Template Execution (Implemented)
- Naming convention: `*.function.html` under `./src/templates/functions/`.
- Runtime entrypoints are defined in `./src/engine/function-template-runtime.js`.
- Supported invocation forms:
	- `{{ fn("name.function.html", { ... }) }}`
	- `{% function "name.function.html" with { ... } %}`
- Function execution uses isolated object context, deterministic rendering, recursion protection, and canonical function error codes.
