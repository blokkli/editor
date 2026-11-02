import { defineCodeTemplate } from '../defineTemplate'
import { falsy } from '../../helpers'

export default defineCodeTemplate(
  'imports',
  (ctx) => {
    const chunkMapping: Record<string, string> = {}
    const hydrationMapping: Record<string, string> = {}

    for (const file of ctx.blocks.files.values()) {
      if (!file.definition) {
        continue
      }

      const hydrate =
        'hydrate' in file.definition ? file.definition.hydrate : undefined
      file.variations.forEach((variation) => {
        chunkMapping[variation] = file.chunkName
        if (hydrate) {
          hydrationMapping[variation] = hydrate
        }
      })
    }
    const toLines = (mapping: Record<string, string>) =>
      Object.entries(mapping)
        .map(([variation, value]) => `'${variation}': '${value}'`)
        .sort()
        .join(',\n  ')
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
  ${toLines(chunkMapping)}
}

export const hydrationMapping = {
  ${toLines(hydrationMapping)}
}
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
 * Mapping of block variation ID to its "hydrate" setting, for the variations
 * that have one.
 */
export declare const hydrationMapping: Record<string, 'never'>
`
  },
  {
    dependencies: ['block-path', 'block-content'],
  },
)
