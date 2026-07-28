# Changelog

All notable changes to this project are documented in this file.

## v2.2.0 - Unreleased

This release establishes an installable, dependency-free Node.js package contract.

### Added

- Added ESM package metadata for the `@mattdanielbrown/html-template-engine` package.
- Added standard `npm test` and `npm run verify-package` commands.
- Added clean tarball installation coverage for root imports, inline rendering, and file rendering.
- Declared support for Node.js 22 and newer.
- Added a provenance-enabled npm release workflow with tag, package, and prerelease safeguards.
- Added public-registry publishing constraints and automatic prepublish verification.

### Compatibility notes

- The documented default and named exports remain unchanged.
- Package consumers import from `@mattdanielbrown/html-template-engine`; internal source subpaths are not exported.
- CommonJS `require()` remains outside the supported public contract.

## v2.1.0 - 2026-03-23

This release finalizes the v2 syntax baseline, ships function-template execution, and completes README-first onboarding coverage.

### Highlights

- Added end-to-end `*.function.html` execution with both invocation forms:
	- `{{ fn("name.function.html", { ... }) }}`
	- `{% function "name.function.html" with { ... } %}`
- Implemented deterministic function runtime behavior:
	- root-safe function path resolution
	- nested function calls
	- recursion detection and depth guard
- Completed v2 engine behavior across parser/renderer features:
	- includes/partials with precedence and fallback
	- helpers (call and pipe forms)
	- canonical parse/render error shaping
	- optional parse/file cache controls

### Documentation

- Updated `README.md` to match implemented v2 behavior and end-to-end usage.
- Updated `templating-engine-specification.md` for function-template execution and v2 contracts.
- Kept `syntax-and-structure-conventions.md` aligned as canonical conventions.

### Testing and quality

- Completed README onboarding integration flow test.
- Added and updated unit and integration tests for function templates and v2 behavior.
- `node --test` status at release cut: 31 pass, 0 fail, 0 todo.

### Compatibility notes

- No breaking API removals.
- Existing public API remains stable; function-template support is additive.
