import { defineCodeTemplate } from '../defineTemplate'
import { falsy } from '../../../vitePlugin'

export default defineCodeTemplate(
  'imports',
  (ctx) => {
    const chunkMapping: Record<string, string> = {}

    for (const file of ctx.blocks.files.values()) {
      if (!file.definition || !file.identifier) {
        continue
      }

      file.variations.forEach((variation) => {
        chunkMapping[variation] = file.chunkName
      })
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
      .join(',\n  ')
    return `
import { global } from '#blokkli-build/chunk-global.js'

export const chunks = {
  global,
  ${chunks}
}

export const chunkMapping = {
  ${lines.join(',\n  ')}
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
`
  },
  {
    dependencies: ['block-path', 'block-content'],
  },
)
