import { setup } from '@nuxt/test-utils/e2e'

/**
 * Configure the Nuxt E2E test context against the locally-running playground at
 * `http://localhost:3000`. `@nuxt/test-utils` then skips its own build/server
 * (`build=false; server=false`) — start the playground yourself, either with
 * `npm run dev` (HMR) or `npm run dev:build && npm run dev:start` (static
 * build, what the test suite is tuned against).
 *
 * MUST be awaited at the TOP of an async `describe` — `setup()` registers its
 * own before/after hooks there, so calling it inside `beforeAll` means no
 * setup runs at all.
 */
export function setupEditorE2E(): Promise<void> {
  return setup({ host: 'http://localhost:3000' })
}
