import { defineCodeTemplate } from '../defineTemplate'
import { falsy } from '../../helpers'

export default defineCodeTemplate(
  'imports',
  (ctx) => {
    const chunkMapping: Record<string, string> = {}
    const neverHydrated: string[] = []

    for (const file of ctx.blocks.files.values()) {
      if (!file.definition) {
        continue
      }

      file.variations.forEach((variation) => {
        chunkMapping[variation] = file.chunkName
      })
      if ('hydrate' in file.definition && file.definition.hydrate === 'never') {
        neverHydrated.push(...file.variations)
      }
    }
    const lines = Object.entries(chunkMapping).map(
      ([variation, importName]) => {
        return `'${variation}': '${importName}'`
      },
    )
    const chunks = ctx.helper
      .getChunkNames()
      .map((chunkName) => {
        if (chunkName === 'global') {
          return null
        }
        return `${chunkName}: () => import('#blokkli-build/chunk-${chunkName}.js').then(v => v['${chunkName}'])`
      })
      .filter(falsy)
      .sort()
      .join(',\n  ')
    return `
import { global } from '#blokkli-build/chunk-global.js'

export const chunks = {
  global,
  ${chunks}
}

export const chunkMapping = {
  ${lines.sort().join(',\n  ')}
}

export const neverHydrated = new Set(${JSON.stringify(neverHydrated.sort())})
`
  },
  () => {
    return `
import type { Component } from 'vue'

export type ChunkGroup = Record<string, Component | { loadComponent: () => Promise<Component> } >
export type ChunkGroupEntry = ChunkGroup | (() => Promise<ChunkGroup>)

/**
 * Mapping of block/fragment variation ID to a chunk group.
 *
 * The variation is only present if its chunkName is not 'global'.
 */
export declare const chunkMapping: Record<string, string>

/**
 * All available chunks.
 */
export declare const chunks: Record<string, ChunkGroupEntry>

/**
 * The block and fragment variations that are never hydrated.
 */
export declare const neverHydrated: Set<string>
`
  },
  {
    dependencies: ['block-path', 'block-content'],
  },
)
