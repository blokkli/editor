import { describe, expect, test } from 'vitest'
import { buildChunkGroupCode } from './chunkGroup'
import type { BlockHydration } from '../../../global/constants'

const text = {
  identifier: 'b_text',
  filePath: '/app/Text.vue',
  variations: ['block:text'],
  hydrate: null,
}

const title = {
  identifier: 'b_title',
  filePath: '/app/Title/Sidebar.vue',
  variations: ['block:title__f:sidebar', 'block:title__p:section'],
  hydrate: 'never' as const,
}

const chart = {
  identifier: 'b_chart',
  filePath: '/app/Chart.vue',
  variations: ['block:chart'],
  hydrate: 'visible' as const,
}

const production = { isDev: false, lazyHydration: true }
const dev = { isDev: true, lazyHydration: true }

describe('buildChunkGroupCode', () => {
  test('imports statically in production, and lazily what has hydrate', () => {
    expect(buildChunkGroupCode('global', [text, title, chart], production))
      .toBe(`
import { defineLazyHydrationComponent } from '#imports'
import b_text from '/app/Text.vue'
const b_chart = defineLazyHydrationComponent('visible', () => import('/app/Chart.vue'))
const b_title = defineLazyHydrationComponent('never', () => import('/app/Title/Sidebar.vue'))

export const global = {
  'block:chart': b_chart,
  'block:text': b_text,
  'block:title__f:sidebar': b_title,
  'block:title__p:section': b_title
}
`)
  })

  test('loads on first render in dev, and lazily what has hydrate', () => {
    expect(buildChunkGroupCode('global', [text, title, chart], dev)).toBe(`
import { defineLazyHydrationComponent } from '#imports'
const b_text = () => import('/app/Text.vue').then(v => v.default)
const b_chart = defineLazyHydrationComponent('visible', () => import('/app/Chart.vue'))
const b_title = defineLazyHydrationComponent('never', () => import('/app/Title/Sidebar.vue'))

export const global = {
  'block:chart': b_chart,
  'block:text': { loadComponent: b_text },
  'block:title__f:sidebar': b_title,
  'block:title__p:section': b_title
}
`)
  })

  test.each<BlockHydration>(['never', 'visible', 'idle'])(
    'passes "%s" as the strategy',
    (hydrate) => {
      expect(
        buildChunkGroupCode('global', [{ ...chart, hydrate }], production),
      ).toContain(
        `const b_chart = defineLazyHydrationComponent('${hydrate}', () => import('/app/Chart.vue'))`,
      )
    },
  )

  test('has the same code as before without hydrate', () => {
    expect(buildChunkGroupCode('global', [text], production)).toBe(`
import b_text from '/app/Text.vue'

export const global = {
  'block:text': b_text
}
`)
    expect(buildChunkGroupCode('global', [text], dev)).toBe(`
const b_text = () => import('/app/Text.vue').then(v => v.default)

export const global = {
  'block:text': { loadComponent: b_text }
}
`)
  })

  test('ignores hydrate in another group', () => {
    const code = buildChunkGroupCode('rare', [chart], production)
    expect(code).toContain(`import b_chart from '/app/Chart.vue'`)
    expect(code).not.toContain('defineLazyHydrationComponent')
  })

  test('ignores hydrate without lazy hydration', () => {
    for (const isDev of [false, true]) {
      const options = { isDev, lazyHydration: false }
      const code = buildChunkGroupCode('global', [text, title, chart], options)
      expect(code).toBe(
        buildChunkGroupCode(
          'global',
          [text, { ...title, hydrate: null }, { ...chart, hydrate: null }],
          options,
        ),
      )
      expect(code).not.toContain('defineLazyHydrationComponent')
    }
  })
})
