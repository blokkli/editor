import type { BlokkliTestApi } from './types'

// Augment the global `window.__BLOKKLI__` object (declared in core) with the
// `test` namespace. Module augmentation must target the module that declares
// the interface.
declare module '#blokkli/editor/composables/useGlobalBlokkliObject' {
  interface BlokkliGlobalWindowObject {
    /** Imperative test API. Only in the dev server and the E2E build. */
    test?: BlokkliTestApi
  }
}
