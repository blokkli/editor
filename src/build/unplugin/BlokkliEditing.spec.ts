import { test, describe, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import type { Nuxt } from '@nuxt/schema'
import { BlokkliEditingPlugin } from './BlokkliEditing'

const MARKER = '__blokkli_editing__'

let srcDir = ''

function getPlugin() {
  const nuxt = {
    options: { srcDir, sourcemap: { client: false, server: false } },
  } as unknown as Nuxt
  const plugin = BlokkliEditingPlugin(nuxt).vite()
  return Array.isArray(plugin) ? plugin[0]! : plugin
}

function resolveId(
  id: string,
  importer?: string,
  options: Record<string, unknown> = {},
): unknown {
  const hook = getPlugin().resolveId
  const handler = typeof hook === 'function' ? hook : hook?.handler

  return (handler as any).call({}, id, importer, { isEntry: false, ...options })
}

beforeAll(() => {
  srcDir = mkdtempSync(join(tmpdir(), 'blokkli-editing-'))
  mkdirSync(join(srcDir, 'components'))
  writeFileSync(join(srcDir, 'components/Foo.vue'), '<template>Foo</template>')
  writeFileSync(join(srcDir, 'components/Bar.vue'), '<template>Bar</template>')
})

afterAll(() => {
  rmSync(srcDir, { recursive: true, force: true })
})

describe('BlokkliEditingPlugin.resolveId', () => {
  test('resolves a ?blokkliEditing=true import to the editing variant', () => {
    expect(
      resolveId(join(srcDir, 'components/Foo.vue?blokkliEditing=true')),
    ).toBe(join(srcDir, `components/Foo${MARKER}.vue`))
  })

  test('resolves a relative ?blokkliEditing=true import against the importer', () => {
    expect(
      resolveId(
        './Foo.vue?blokkliEditing=true',
        join(srcDir, 'components/Bar.vue'),
      ),
    ).toBe(join(srcDir, `components/Foo${MARKER}.vue`))
  })

  test('resolves an editing variant requested by its URL in the root', () => {
    expect(resolveId(`/components/Foo${MARKER}.vue`)).toBe(
      join(srcDir, `components/Foo${MARKER}.vue`),
    )
  })

  test("keeps the query of Vue's sub-modules", () => {
    expect(
      resolveId(`/components/Foo${MARKER}.vue?vue&type=style&index=0&lang.css`),
    ).toBe(
      join(srcDir, `components/Foo${MARKER}.vue`) +
        '?vue&type=style&index=0&lang.css',
    )
  })

  test('leaves an editing variant with a file path to Vite', () => {
    expect(resolveId(join(srcDir, `components/Foo${MARKER}.vue`))).toBe(
      undefined,
    )
  })

  test('leaves a URL that is no file in the root to Vite', () => {
    expect(resolveId(`/components/Missing${MARKER}.vue`)).toBe(undefined)
  })

  test('propagates editing to the .vue imports of an editing variant', () => {
    const importer = join(srcDir, `components/Foo${MARKER}.vue`)
    const expected = join(srcDir, `components/Bar${MARKER}.vue`)
    expect(resolveId('./Bar.vue', importer)).toBe(expected)
    expect(resolveId(join(srcDir, 'components/Bar.vue'), importer)).toBe(
      expected,
    )
    expect(resolveId('/components/Bar.vue', importer)).toBe(expected)
    expect(
      resolveId(
        join(srcDir, 'components/Bar.vue'),
        importer + '?vue&type=script&setup=true&lang.ts',
      ),
    ).toBe(expected)
  })

  test('does not propagate editing from a regular component', () => {
    expect(resolveId('./Bar.vue', join(srcDir, 'components/Foo.vue'))).toBe(
      undefined,
    )
  })

  test("leaves everything to Vite's dependency scanner", () => {
    expect(
      resolveId(
        join(srcDir, 'components/Foo.vue?blokkliEditing=true'),
        undefined,
        {
          scan: true,
        },
      ),
    ).toBe(undefined)
    expect(
      resolveId('./Bar.vue', join(srcDir, `components/Foo${MARKER}.vue`), {
        scan: true,
      }),
    ).toBe(undefined)
  })
})

describe('BlokkliEditingPlugin.load', () => {
  test('loads an editing variant from its original file', () => {
    const hook = getPlugin().load
    const handler = typeof hook === 'function' ? hook : hook?.handler
    const watched: string[] = []

    const result = (handler as any).call(
      { addWatchFile: (file: string) => watched.push(file) },
      join(srcDir, `components/Foo${MARKER}.vue`),
    )
    expect(result).toBe('<template>Foo</template>')
    expect(watched).toEqual([join(srcDir, 'components/Foo.vue')])
  })
})
