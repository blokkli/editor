import type { LogMessage } from '../../helpers/providers/debug'

type BlokkliGlobalWindowObject = {
  messages: LogMessage[]
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

  function cleanup() {
    if (typeof window !== 'undefined') {
      delete window.__BLOKKLI__
    }
  }

  return {
    init,
    pushMessage,
    getMessages,
    cleanup,
  }
}

declare global {
  interface Window {
    __BLOKKLI__?: BlokkliGlobalWindowObject
  }
}
