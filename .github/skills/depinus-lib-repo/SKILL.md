---
name: depinus-lib-repo
description: "Create a new TypeScript/React library repository in the NHuffschmid/Depinus submodule style. Use when: creating a new npm-free, source-distributed TypeScript library or React component that will be integrated into Depinus as a git submodule. Covers folder structure, package.json, tsconfig, vitest, GitHub Actions CI, README, CHANGELOG, .gitignore, and submodule registration."
argument-hint: "<repo-name> [react|module] — e.g. 'my-lib react' or 'my-lib module'"
---

# Create Depinus-style TypeScript Library Repository

## When to Use

Invoke this skill when the user wants to create a new standalone GitHub repository that:
- Is a TypeScript/JavaScript **library** or **React component**
- Will be **embedded as a git submodule** inside the Depinus project (under `www/client/src/modules/` or `www/client/src/components/`)
- Is **not published to npm** — consumers import from source or copy files
- Should follow the same conventions as `midi2musicxml` and `react-piano-keyboard`

## Established Conventions (from the two reference submodules)

| Convention | Value |
|---|---|
| Module system | `"type": "module"` (ESM) |
| Entry point | `./index.ts` (TypeScript source, no build step) |
| Language | TypeScript 5, strict mode |
| Test runner | Vitest (jsdom environment) |
| Test location | `__tests__/` (complex modules) or `test/` (React components) |
| Node CI matrix | 20.x, 22.x |
| License | MIT |
| Author | `Norbert Huffschmid <depinus@gmx.de>` |
| Peer dep React | Optional, `>=18` (only for React components) |
| Version start | `0.1.0` |
| tsconfig target | `ES2020`, `moduleResolution: Bundler` |

## Repository Types

### Type A — Pure TypeScript Module (like `midi2musicxml`)
- Flat source layout with named subdirectories: `analysis/`, `models/`, `transforms/`, `utils/`
- Optional `react/` subdirectory for React-specific hooks/workers
- Tests in `__tests__/<subdirectory>/`
- `ARCHITECTURE.md` for pipeline or complex design documentation
- `debug/` for debug dump utilities

### Type B — React Component (like `react-piano-keyboard`)
- Source in `src/`: `ComponentName.tsx`, `ComponentName.css`, `index.ts` barrel
- Tests in `test/`
- Optional `setupTests.ts` for jsdom matchers (`@testing-library/jest-dom`)
- `screenshot.png` for README illustration

Both types include an `example/` Vite + React demo app (see Example App section).

---

## Step-by-Step Procedure

### 1. Create the Repository

Create the repository on GitHub under `https://github.com/NHuffschmid/<repo-name>`.

**Checklist:**
- Public repository
- MIT License
- No initial README (we generate it)
- Default branch: `main`

---

### 2. Scaffold the Files

#### `.gitignore`
```
node_modules/
dist/
*.tsbuildinfo
```

#### `LICENSE`
Use the standard MIT license with author `Norbert Huffschmid`.

#### `package.json` — Type A (Pure Module)

```json
{
  "name": "<repo-name>",
  "version": "0.1.0",
  "description": "<short description>",
  "type": "module",
  "main": "./index.ts",
  "exports": {
    ".": "./index.ts"
  },
  "scripts": {
    "test":          "vitest --run",
    "test:watch":    "vitest",
    "test:coverage": "vitest --coverage",
    "typecheck":     "tsc --noEmit && tsc --noEmit -p example"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^22.0.0",
    "jsdom": "^28.0.0",
    "typescript": "^5.0.0",
    "vitest": "^4.0.0"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/NHuffschmid/<repo-name>.git"
  },
  "homepage": "https://github.com/NHuffschmid/<repo-name>#readme",
  "bugs": {
    "url": "https://github.com/NHuffschmid/<repo-name>/issues"
  },
  "author": "Norbert Huffschmid <depinus@gmx.de>",
  "keywords": []
}
```

**For React components**, add:
```json
"peerDependencies": {
  "react": ">=18"
},
"peerDependenciesMeta": {
  "react": { "optional": true }
},
```
and add `@types/react`, `@testing-library/jest-dom`, `@testing-library/react` to `devDependencies`.

#### `tsconfig.json` — Type A (Pure Module)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "example"]
}
```

**For React components**, add `"jsx": "react-jsx"` and `"types": ["vitest/globals"]` to `compilerOptions`, and `"**/*.tsx"` to `include`.

#### `vitest.config.ts` — Type A (Pure Module)

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['__tests__/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '**/example/**'],
  },
});
```

**For React components**:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./setupTests.ts']
  }
});
```

#### `setupTests.ts` (React components only)

```ts
import '@testing-library/jest-dom';
```

#### `index.ts` (barrel export)

```ts
// Export all public API from the library
export { MyMainClass } from './path/to/source';
export type { MyType } from './path/to/types';
```

---

### 3. GitHub Actions CI

Create `.github/workflows/ci.yml`:

**Type A (Pure Module):**
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20.x, 22.x]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install example dependencies
        run: npm ci
        working-directory: example

      - name: TypeScript type check
        run: npm run typecheck

      - name: Run tests
        run: npm test
```

**Type B (React component)** — same but without the "Install example dependencies" step (example is installed separately by the developer).

---

### 4. README.md Template

```markdown
# <repo-name>

![CI](https://github.com/NHuffschmid/<repo-name>/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

<One-sentence description.>

## Features
- Feature 1
- Feature 2

## Installation

Since there is no official npm package yet, copy the relevant source files into your project,
or use it as a git submodule:

```sh
git submodule add https://github.com/NHuffschmid/<repo-name>.git path/to/<repo-name>
```

## Usage

```ts
import { MyFunction } from './<repo-name>';
```

## API

### `myFunction(input, options?): Result`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `option` | `string` | `'default'` | Description |

## Example

See the [`example/`](example/README.md) directory for a runnable Vite + React app.

## Known Bugs / Limitations
- This project is part of the DEPINUS project: https://github.com/NHuffschmid/depinus

## License
MIT

## Author
Norbert Huffschmid <depinus@gmx.de>
```

---

### 5. CHANGELOG.md Template

```markdown
# CHANGELOG

## Version 0.1.0
- Initial version
```

---

### 6. Example App (`example/`)

Each repository contains a minimal Vite + React demo:

```
example/
  index.html
  package.json        # Vite + React devDeps, no name in npm
  src/
    App.tsx
    main.tsx
  tsconfig.json       # extends ../tsconfig.json or standalone
  vite.config.ts
  README.md
```

The example imports from the parent repo via relative path (`../index.ts`).

---

### 7. ARCHITECTURE.md (Type A only)

For complex pipeline-based modules, create `ARCHITECTURE.md` documenting:
- Overview diagram (ASCII or text pipeline)
- Each stage/transform: purpose, inputs, outputs, key file paths
- Key types and data models

---

### 8. Register as Depinus Git Submodule

After pushing the new repo to GitHub:

```sh
# From the Depinus root
git submodule add https://github.com/NHuffschmid/<repo-name>.git www/client/src/<modules|components>/<repo-name>
git commit -m "Add <repo-name> as git submodule"
```

Update the host project's `package.json` / import paths to reference the submodule.

---

## File Structure Summary

### Type A — Pure TypeScript Module
```
<repo-name>/
├── .github/
│   └── workflows/
│       └── ci.yml
├── __tests__/
│   └── <subdirectory>/
├── analysis/         # domain-specific analysis utilities
├── models/           # data model types per pipeline stage
├── transforms/       # stage-to-stage transformation functions
├── utils/            # low-level helpers
├── react/            # optional: React hooks / workers
├── debug/            # optional: dump/pretty-print utilities
├── example/          # Vite + React demo app
├── .gitignore
├── ARCHITECTURE.md   # optional, for complex modules
├── CHANGELOG.md
├── index.ts
├── LICENSE
├── package.json
├── README.md
├── tsconfig.json
├── types.ts          # optional: shared type definitions
└── vitest.config.ts
```

### Type B — React Component
```
<repo-name>/
├── .github/
│   └── workflows/
│       └── ci.yml
├── example/          # Vite + React demo app
├── src/
│   ├── index.ts          # barrel export
│   ├── Component.tsx
│   ├── Component.css
│   └── helpers.ts
├── test/
│   └── Component.test.tsx
├── .gitignore
├── CHANGELOG.md
├── LICENSE
├── package.json
├── README.md
├── screenshot.png        # for README badge/preview
├── setupTests.ts
├── tsconfig.json
└── vitest.config.ts
```

---

## Quality Checklist Before First Commit

- [ ] `npm ci && npm run typecheck` passes
- [ ] `npm test` passes with at least one test
- [ ] `example/` runs with `cd example && npm ci && npm run dev`
- [ ] `README.md` has CI badge, features, installation, usage, and API table
- [ ] `CHANGELOG.md` has the initial version entry
- [ ] `.gitignore` excludes `node_modules/`, `dist/`, `*.tsbuildinfo`
- [ ] `LICENSE` is MIT
- [ ] CI workflow triggers on `push` and `pull_request` to `main`
- [ ] Repository is public on GitHub under `NHuffschmid/`
