# Contributing to qr-lens

**🌐 Language:** **English** · [Español](./CONTRIBUTING.es.md)

Thanks for your interest in improving **qr-lens**! 🎉 Every contribution is
welcome: issues, documentation improvements, translations, new code formats, or
bug fixes.

## Requirements

- Node.js >= 18
- npm

## Getting started

```bash
git clone https://github.com/duvan177/qr-lens.git
cd qr-lens
npm install
npm run dev        # starts the local playground/demo
```

## Workflow

1. Create a fork and a descriptive branch: `git checkout -b feat/torch-toggle`.
2. Make your changes following the project's style.
3. Make sure everything passes locally:

   ```bash
   npm run typecheck
   npm run lint
   npm run test
   npm run build
   ```

4. Add a **changeset** describing your change (see below).
5. Open a Pull Request against `main` and fill in the template.

## Changesets (versioning)

We use [Changesets](https://github.com/changesets/changesets). If your change
affects what gets published to npm, run:

```bash
npm run changeset
```

Pick `patch` (bug fix), `minor` (backward-compatible feature), or `major`
(breaking change), describe the change, and include the generated file in your
PR. Do not bump the version manually — the release bot does it.

## Code style

- TypeScript in `strict` mode.
- ESLint + Prettier (`npm run lint:fix` and `npm run format`).
- Keep utility functions pure and testable.
- UI messages live in `src/i18n/messages.ts`, never hardcoded.

## Adding a language or a format

The project includes quick guides:

- **New language**: add the catalog in `src/i18n/messages.ts` and a test in
  `test/messages.test.ts`.
- **Code format**: check `src/utils/detector.ts`.

## Documentation (bilingual)

Docs are kept in English and Spanish:

- `README.md` (EN) ↔ `README.es.md` (ES)
- `CONTRIBUTING.md` (EN) ↔ `CONTRIBUTING.es.md` (ES)
- `CODE_OF_CONDUCT.md` (EN) ↔ `CODE_OF_CONDUCT.es.md` (ES)

When you change one language, please mirror the change in the other. If you can
only do one, say so in the PR and we'll help with the translation.

## Tests

We use [Vitest](https://vitest.dev). Tests live in `test/`. Prioritize covering
the pure utilities (`canvas`, `camera`, `detector`, `i18n`). For the hook and
the component, mock `getUserMedia` and `BarcodeDetector`.

```bash
npm run test          # once
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

## Reporting bugs

Open an issue with the bug template and include the browser, version, and, if
possible, a minimal reproducible case.

## Code of Conduct

By participating you agree to our [Code of Conduct](./CODE_OF_CONDUCT.md).
