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
  test('maps every variation of a block that is never hydrated', () => {
    const code = buildCode([
      {
        definition: { bundle: 'text', hydrate: 'never' },
        variations: ['block:text', 'block:text__p:section'],
      },
      { definition: { bundle: 'accordion' }, variations: ['block:accordion'] },
    ])

    expect(code).toContain(`export const hydrationMapping = {
  'block:text': 'never',
  'block:text__p:section': 'never'
}`)
  })

  test('maps nothing when no block sets hydrate', () => {
    const code = buildCode([
      { definition: { bundle: 'accordion' }, variations: ['block:accordion'] },
    ])

    expect(code).toMatch(/export const hydrationMapping = \{\s*\}/)
  })
})
