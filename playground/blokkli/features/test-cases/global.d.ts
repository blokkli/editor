import type { BlokkliTestApi } from './types'

// Augment the global `window.__BLOKKLI__` object (declared in core) with the
// playground-only `test` namespace. Module augmentation must target the module
// that declares the interface.
declare module '#blokkli/editor/composables/useGlobalBlokkliObject' {
  interface BlokkliGlobalWindowObject {
    /** Playground-only imperative test API. Assigned in dev builds only. */
    test?: BlokkliTestApi
  }
}
