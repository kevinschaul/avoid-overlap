# CLAUDE.md — avoid-overlap

This file provides guidance for AI assistants working in this repository.

## Project Overview

**avoid-overlap** is a TypeScript library that resolves text label overlaps in data visualizations. It is designed to work with D3.js, React, or any DOM-based visualization framework. Published on npm as `avoid-overlap`. MIT license. Author: Kevin Schaul.

## Development Commands

```bash
npm run dev             # Watch-mode TypeScript compilation + Storybook on :6006
npm run build           # Compile src/ → dist/ using SWC
npm test                # Run Jest tests
npm run storybook       # Start Storybook dev server on port 6006
npm run build-storybook # Build static Storybook site
```

**Primary development workflow:** `npm run dev` — runs SWC in watch mode and starts Storybook simultaneously via `concurrently`.

## Key Architecture

### Core Class: `AvoidOverlap`

Located in `src/index.ts`. The main export is the `AvoidOverlap` class with a single public method:

```ts
avoidOverlap.run(parent: Element, labelGroups: LabelGroup[], options: Options)
```

Call this **after** all labels are positioned in the DOM. Each `LabelGroup` specifies a `technique` (discriminated union — see the `LabelGroup` type in `src/index.ts` for the current set of techniques and their options).

### Spatial Indexing

Uses **RBush** (R-tree) for O(log n) bounding-box collision detection. All labels are stored as `Body` objects with `{minX, minY, maxX, maxY}` bounding boxes. The tree is updated in-place as labels are moved.

### Priority System

- Higher `priority` value = label is more likely to stay in place.
- Within the same priority, earlier nodes in the `nodes` array have higher intra-group priority (`priorityWithinGroup`).
- The `orderBodies()` function determines which body moves when two collide.
- Static bodies (parent boundary walls) have `priority: Infinity`.

### Collision Resolution

After technique-specific passes run, a nudge retry loop runs up to `maxAttempts` times (default `3`). Any labels still overlapping after all attempts are removed from the DOM by `removeCollisions()`.

### Parent Boundary Support

When `options.includeParent = true`, four invisible static bodies are added as walls around the parent element's bounding box. Labels will not be nudged outside these boundaries.

### Debug Mode

```js
avoidOverlap.run(parent, labelGroups, { debug: true });
```

Logs a JSON serialization of all inputs to the console, and draws colored SVG boxes showing each label's position history. The JSON output can be pasted into Storybook's `real-world-exports` story for visual debugging.

## Testing

Tests are written as Storybook stories (visual regression approach). Jest is configured to run them with `jest-environment-jsdom` and SWC as the transformer.

```bash
npm test          # Run Jest (passWithNoTests — ok if no unit tests match)
npm run storybook # Visual testing via Storybook
```

Test utilities in `test/util.ts`:
- `render()` — Creates an SVG canvas for test setup.
- `play()` — Orchestrates test execution with mocked DOM elements.
- `playExportedArgs()` — Tests with serialized/exported args (copy from debug output).

## Commit Conventions

This project uses **Conventional Commits** enforced by commitlint + husky:

```
feat: add new feature
fix: fix a bug
chore: maintenance tasks
docs: documentation only
refactor: code refactoring
test: test changes
```

The `release-please` CI action reads conventional commits to determine version bumps (feat → minor, fix → patch) and auto-generates CHANGELOG entries.

## Code Style

- **TypeScript** strict mode (`strictNullChecks: true`).
- **Prettier** with single quotes (see `.prettierrc.json`).
- **ESLint** with `airbnb-base` + TypeScript rules.
- `lint-staged` runs Prettier on staged `.js` files before commits.
- Functional helpers `first()` and `all()` are used instead of `.find()` / `.filter()` for performance in inner loops.
- Coordinate variables use single-letter names (`x`, `y`, `dx`, `dy`).
- Default values are applied at call sites in `run()`, not at the type level.

## Adding New Features

1. Work in `src/index.ts` for algorithm changes; `src/debug.ts` for debug visualization.
2. Add a Storybook story in `test/` to visually verify behavior.
3. Follow conventional commit format.
4. Build before testing: `npm run build && npm test`.
5. PR into `main` — release-please handles versioning automatically.

## Important Constraints

- This is an **ESM package** (`"type": "module"`). Imports in `src/` use `.js` extensions even for TypeScript source files (see `import { defaultDebugFunc } from './debug.js'`).
- The library is **DOM-dependent** — it calls `getBoundingClientRect()` on elements, so it only works in a browser or jsdom environment.
