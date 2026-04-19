import type { Fzf, AsyncFzf, FzfOptions, AsyncFzfOptions } from 'fzf'

let modulePromise: Promise<typeof import('fzf')> | null = null

export function loadFzf(): Promise<typeof import('fzf')> {
  if (!modulePromise) {
    modulePromise = import('fzf')
  }
  return modulePromise
}

export type { Fzf, AsyncFzf, FzfOptions, AsyncFzfOptions }
