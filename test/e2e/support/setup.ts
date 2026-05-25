import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils/e2e'

/**
 * Configure the Nuxt E2E test context. Two modes, selected by `E2E_HOST`:
 *
 *  - **set** (e.g. `E2E_HOST=http://localhost:3000`): run the specs against an
 *    ALREADY-RUNNING server (your `npm run dev`). `@nuxt/test-utils` then skips
 *    the build and its own server (`build=false; server=false`), so there's no
 *    ~30s build per run — iteration is instant. Ideal for local development and
 *    debugging. Pair it with the Playwright MCP for live poking at the same server.
 *
 *  - **unset**: a hermetic production build of the playground (`rootDir` +
 *    `server: true`). Used in CI and for a final, reproducible check. Build mode
 *    (`dev: false`) is deliberate — it avoids dev-mode HMR reloads triggered by
 *    the editor's async component imports. The `window.__BLOKKLI__` exposure and
 *    the `test-cases` playground feature are unconditional precisely so they
 *    survive this build (see the TODOs in EditProvider / the test-cases feature).
 *
 * MUST be awaited at the TOP of an async `describe` — `setup()` registers its own
 * before/after hooks there, so calling it inside `beforeAll` means the build
 * never runs.
 */
export function setupEditorE2E(): Promise<void> {
  const host = process.env.E2E_HOST
  if (host) {
    return setup({ host })
  }
  return setup({
    rootDir: fileURLToPath(new URL('../../../playground', import.meta.url)),
    server: true,
  })
}
