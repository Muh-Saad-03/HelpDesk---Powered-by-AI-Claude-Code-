---
name: CJS compat in Playwright files
description: playwright.config.ts and globalSetup run in Node CJS context — avoid import.meta and export default
type: feedback
---

Playwright's config loader and globalSetup runner execute in a Node CJS context (not Bun ESM), even when the project uses ESM.

Rules:
- Use `__dirname` not `import.meta.dirname` in `playwright.config.ts`
- Use `module.exports = fn` not `export default fn` in `e2e/global-setup.ts`
- Regular spec files (`*.spec.ts`) and `auth.setup.ts` use normal ESM `import`/`export` — only the config and globalSetup are affected

**Why:** When I first wrote `import.meta.dirname` in `playwright.config.ts` and `export default` in `global-setup.ts`, Playwright threw `ReferenceError: exports is not defined` because its internal loader wraps these files with CJS `require()`.

**How to apply:** Any time a new `globalSetup` file or module that `playwright.config.ts` imports directly is created, use `__dirname`/`module.exports` rather than ESM syntax.
