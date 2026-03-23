# Overview: HTML Template Engine

## Project Purpose
This project defines a simple, JavaScript-based HTML templating engine for server-side rendering in Node.js.

It focuses on:
- clear template syntax
- deterministic render behavior
- secure default output escaping
- minimal runtime and dependency footprint

## Non-Goals
This v1 design does not try to be a full application framework or a drop-in replacement for larger template systems.

Out of scope for v1:
- client-side or browser-first rendering APIs
- arbitrary JavaScript execution inside templates
- reactive UI updates or component lifecycle management
- framework-specific integrations (Express helpers can be added later)
- i18n, macro systems, and advanced inheritance chains

## Target Users
Primary users:
- developers building static sites or server-rendered pages in Node.js
- teams that want predictable templating with low complexity
- projects that need safe HTML escaping by default

## Problem Statement
Large templating systems often include many features that increase mental overhead, security risk, and maintenance cost for small and medium use cases.

This engine is designed for the common 80 percent use case:
- interpolate data
- conditionally render blocks
- iterate lists
- include partial files
- run small, explicit helper functions

## Why Not a Full-Featured Engine
This project prioritizes a narrow, stable core over feature breadth.

Tradeoffs:
- lower learning curve over maximum expressiveness
- explicit helpers over unrestricted in-template logic
- deterministic behavior over dynamic convenience
- simple architecture over plugin-heavy extensibility

## Design Principles
- **Simplicity first**: a small syntax surface with explicit rules.
- **Safety by default**: escaped output unless raw output is explicit.
- **Determinism**: same template + same context always yields the same output.
- **Minimal dependencies**: prefer Node.js built-in modules.
- **Docs-first implementation**: specification drives parser and renderer design.

## Shared Terminology
These definitions are canonical and should match other project docs.

- **Template**: a text document with literal HTML plus template tags.
- **Partial**: a reusable template fragment included by name/path.
- **Context**: structured input data passed to a render call.
- **Render Pass**: one complete parse/evaluate/output cycle for a template.
- **Helper/Filter**: a registered function that transforms or derives output values.
