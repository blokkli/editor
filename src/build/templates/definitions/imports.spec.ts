import { describe, expect, test } from 'vitest'
import imports from './imports'
import type { ModuleContext } from '../../ModuleContext'

function buildCode(
  files: { definition: object; variations: string[] }[],
): string {
  const context = {
    blocks: {
      files: new Map(
        files.map((file, i) => [String(i), { chunkName: 'global', ...file }]),
      ),
    },
    helper: { getChunkNames: () => ['global'] },
  } as unknown as ModuleContext
  return imports.buildCode(context) as string
}

describe('imports template', () => {
  test('lists every variation of a block that is never hydrated', () => {
    const code = buildCode([
      {
        definition: { bundle: 'text', hydrate: 'never' },
        variations: ['block:text', 'block:text__p:section'],
      },
      { definition: { bundle: 'accordion' }, variations: ['block:accordion'] },
    ])

    expect(code).toContain(
      'export const neverHydrated = new Set(["block:text","block:text__p:section"])',
    )
  })

  test('lists nothing when no block sets hydrate', () => {
    const code = buildCode([
      { definition: { bundle: 'accordion' }, variations: ['block:accordion'] },
    ])

    expect(code).toContain('export const neverHydrated = new Set([])')
  })
})
