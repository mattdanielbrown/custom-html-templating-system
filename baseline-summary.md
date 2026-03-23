# Baseline Summary (Post v2 Alignment)

## Baseline-Ready Criteria

- all non-TODO tests pass
- API and docs are synchronized with current runtime behavior
- v2 syntax conventions are canonicalized in `syntax-and-structure-conventions.md`
- phase 2, 3, and 4 implementation tests are executable and green

## Completed in This Baseline

- phase 2 implemented: include/partial lookup precedence, include fallback, missing-partial canonical errors, traversal rejection tests
- phase 3 implemented: helper registration + call syntax + pipe syntax + missing-helper diagnostics tests
- phase 4 implemented: parse cache and file cache options, deterministic file cache invalidation tests
- docs updated: README + specification + canonical conventions file aligned to v2

## Function Template Execution Kickoff (Scaffold Only)

- added `src/engine/function-template-runtime.js`
	- `resolveFunctionTemplatePath(templateEngine, functionTemplatePath)`
	- `invokeFunctionTemplate()` placeholder
- added kickoff tests in `tests/unit/function-template-execution-kickoff.test.js`
	- current scaffold behavior is verified
	- next-cycle TODO tests capture expected function-template runtime behavior

## Out of Scope in This Baseline

- parsing and executing function-template invocation syntax in main renderer
- argument binding semantics across function-template calls
- macro/function template caching strategy
