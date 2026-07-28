# Roadmap

## Summary
The v2 runtime phases are complete. Current work focuses on packaging and production-readiness while preserving the stable rendering contract.

## v2.2.0: Installable Package Baseline

### Deliverables
- ESM package metadata with a root-only public export
- dependency-free install and standard npm lifecycle commands
- clean tarball install and consumer smoke tests
- declared Node.js 22-or-newer runtime support
- provenance-enabled npm release automation

### Exit Criteria
- `npm test` passes the full suite
- `npm run verify-package` accepts only the intended package contents
- a packed tarball installs and renders from a clean temporary project
- a stable GitHub Release publishes only its matching package version after all checks pass
- existing runtime API, syntax, errors, and cache behavior remain unchanged

### Deferred
- npm registry publication
- CommonJS compatibility
- configurable partial directory behavior
- function-template-specific benchmarks and advanced macro features

## Phase 1: Parser and Renderer Core
**Status: Complete**
### Entry Criteria
- `templating-engine-specification.md` approved as v1 source of truth
- syntax subset frozen for interpolation, if blocks, each blocks, and comments

### Deliverables
- tokenizer and parser for v1 core syntax
- abstract syntax tree definitions
- renderer with deterministic scope resolution and escaping

### Exit Criteria
- core syntax examples in README render correctly
- parse and render error classes exist with canonical fields
- no arbitrary JavaScript execution path in parser or renderer

## Phase 2: File Loading and Partials
**Status: Complete**
### Entry Criteria
- phase 1 parser/renderer test suite stable

### Deliverables
- template file loading utilities
- partial registration and partial file resolution
- root-directory path guardrails

### Exit Criteria
- `render-template-file` passes positive and negative path tests
- unresolved partials emit canonical render errors
- directory traversal attempts are blocked

## Phase 3: Helpers and Diagnostics
**Status: Complete**
### Entry Criteria
- partial resolution and base rendering behavior stable

### Deliverables
- helper registration and invocation
- pipe/filter invocation support
- improved error snippets and location metadata

### Exit Criteria
- helper behavior is deterministic and documented
- missing helper failures emit canonical errors
- diagnostics identify line/column reliably for parse failures

## Phase 4: Performance and Caching
**Status: Runtime and cache coverage complete; reproducible benchmark deferred**
### Entry Criteria
- feature set for v1 is functionally complete

### Deliverables
- optional template parse cache
- optional file read cache with invalidation strategy
- baseline benchmark script and thresholds

### Exit Criteria
- benchmark documented and reproducible
- cache on/off behavior is test-covered
- no behavior regression between cached and uncached rendering

## Phase 5: Docs Hardening and Examples
**Status: In progress**
### Entry Criteria
- core implementation and tests are stable

### Deliverables
- aligned docs updates across overview, README, and specification
- end-to-end example templates and context files
- contributor onboarding flow validated

### Exit Criteria
- docs are internally consistent with implementation
- new contributor can complete first render from README without unstated steps
- roadmap items for v1 are marked complete

## Risk Register and Mitigations
- **Parser complexity growth**: keep grammar narrow; defer advanced syntax to post-v1.
- **Path traversal/security mistakes**: enforce root resolution and add dedicated security tests.
- **Spec drift**: treat specification doc as source of truth; require docs update in feature PRs.
- **API churn**: freeze public interface names once Phase 1 exits.

## Definition of Done (v1)
- all stable API methods implemented per specification
- deterministic rendering behavior with documented scope rules
- default HTML escaping and documented raw output semantics
- comprehensive tests for parser, renderer, partials, helpers, and error cases
- docs set (`overview.md`, `README.md`, `templating-engine-specification.md`, `roadmap.md`, `syntax-and-structure-conventions.md`) consistent and complete
