import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import chunkGroup from './chunkGroup'
import type { ModuleCodeTemplate, ModuleTemplate } from '../defineTemplate'
import type { ModuleHelper } from '../../ModuleHelper'
import type { ModuleContext } from '../../ModuleContext'

// The template skips files that don't exist: any real file will do.
const EXISTING_FILE = fileURLToPath(import.meta.url)

function block(identifier: string, chunkName: string, variations: string[]) {
  return {
    identifier,
    chunkName,
    variations,
    filePath: EXISTING_FILE,
    type: 'block',
    definition: {},
  }
}

async function buildChunk(chunkName: string, isDev: boolean) {
  const helper = {
    isDev,
    getChunkNames: () => ['global', 'rare'],
  } as unknown as ModuleHelper

  const files = [
    block('BlokkliText', 'global', ['block:text']),
    block('BlokkliSlider', 'global', ['block:slider', 'block:slider__p:grid']),
    block('BlokkliTable', 'rare', ['block:table']),
  ]
  const ctx = {
    blocks: { files: new Map(files.map((file) => [file.identifier, file])) },
  } as unknown as ModuleContext

  const templates = [chunkGroup(helper)].flat() as ModuleTemplate[]
  const template = templates.find(
    (t): t is ModuleCodeTemplate =>
      t.type === 'code' && t.name === 'chunk-' + chunkName,
  )
  return template!.buildCode(ctx)
}

describe('chunk group template', () => {
  it('loads each global block on its own in production, so a page only downloads the blocks it renders', async () => {
    const code = await buildChunk('global', false)

    expect(code).not.toMatch(/^import /m)
    expect(code).toContain(
      `const BlokkliText = () => import('${EXISTING_FILE}')`,
    )
    expect(code).toContain(`'block:text': { loadComponent: BlokkliText }`)
    expect(code).toContain(`'block:slider': { loadComponent: BlokkliSlider }`)
    expect(code).toContain(
      `'block:slider__p:grid': { loadComponent: BlokkliSlider }`,
    )
    expect(code).not.toContain('BlokkliTable')
  })

  it('keeps the blocks of a named chunk in that one chunk in production', async () => {
    const code = await buildChunk('rare', false)

    expect(code).toContain(`import BlokkliTable from '${EXISTING_FILE}'`)
    expect(code).toContain(`'block:table': BlokkliTable`)
  })

  it('loads every block on its own in dev', async () => {
    const code = await buildChunk('rare', true)

    expect(code).toContain(`'block:table': { loadComponent: BlokkliTable }`)
  })
})
