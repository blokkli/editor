import type { LogMessage } from '#blokkli/editor/providers/debug'
import type { BlokkliApp } from '#blokkli/editor/types/app'

export interface BlokkliGlobalWindowObject {
  messages: LogMessage[]

  /**
   * The full editor API (the object returned by `useBlokkli()`).
   *
   * Assigned (see `setApp`) so E2E tests can both drive the editor (mutations,
   * event bus) and assert against live state. Playground-only test scaffolding
   * augments this interface with a `test` namespace (see the playground
   * `test-cases` feature).
   *
   * TODO: currently assigned unconditionally so E2E can run against a production
   * build (dev-mode E2E triggers HMR reloads). Re-gate behind `import.meta.dev`
   * so it never reaches a real production bundle once E2E can run in dev mode.
   */
  app?: BlokkliApp
}

export function useGlobalBlokkliObject() {
  function init() {
    if (typeof window !== 'undefined') {
      if (!window.__BLOKKLI__) {
        window.__BLOKKLI__ = {
          messages: [],
        }
      }
    }
  }

  function pushMessage(message: LogMessage) {
    if (typeof window !== 'undefined' && window.__BLOKKLI__) {
      window.__BLOKKLI__.messages.push(message)
      // Limit to 1000 messages - keep only the most recent
      if (window.__BLOKKLI__.messages.length > 1000) {
        window.__BLOKKLI__.messages = window.__BLOKKLI__.messages.slice(-1000)
      }
    }
  }

  function getMessages(): LogMessage[] {
    if (typeof window !== 'undefined' && window.__BLOKKLI__) {
      return window.__BLOKKLI__.messages
    }
    return []
  }

  /**
   * Expose the editor API on `window.__BLOKKLI__.app` for E2E tests.
   *
   * TODO: should eventually be guarded by `import.meta.dev` at the call site so
   * it never reaches a production bundle — see the `app` field doc above.
   */
  function setApp(app: BlokkliApp) {
    if (typeof window !== 'undefined' && window.__BLOKKLI__) {
      window.__BLOKKLI__.app = app
    }
  }

  function cleanup() {
    if (typeof window !== 'undefined') {
      delete window.__BLOKKLI__
    }
  }

  return {
    init,
    pushMessage,
    getMessages,
    setApp,
    cleanup,
  }
}

declare global {
  interface Window {
    __BLOKKLI__?: BlokkliGlobalWindowObject
  }
}
