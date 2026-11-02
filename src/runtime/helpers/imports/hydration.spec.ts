// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest'
import {
  Suspense,
  createSSRApp,
  defineAsyncComponent,
  defineComponent,
  h,
  nextTick,
  ref,
  useId,
} from 'vue'
import type { Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { withoutHydration } from './hydration'

const isClient = ref(false)
let clientSetups = 0

const Counter = defineComponent({
  props: { label: { type: String, required: true } },
  setup(props) {
    if (isClient.value) {
      clientSetups++
    }
    const count = ref(0)
    return () =>
      h(
        'button',
        { onClick: () => count.value++ },
        `${props.label} ${count.value}`,
      )
  },
})

const clientIds: string[] = []
const WithId = defineComponent({
  setup() {
    const id = useId()
    if (isClient.value) {
      clientIds.push(id)
    }
    return () => h('label', { id })
  },
})

// useId() derives its prefix from the async boundaries before it.
const LaterAsync = defineAsyncComponent(() => Promise.resolve(WithId))

const settle = () => new Promise((resolve) => setTimeout(resolve))

/**
 * Renders a page on the "server", then hydrates it on the "client", inside
 * <Suspense> like Nuxt. The block component is resolved once per rendered
 * block on both sides, like BlokkliItem does.
 */
async function hydrate(resolveBlock: () => Component) {
  const label = ref('Static')
  const page = () =>
    createSSRApp({
      setup() {
        const block = resolveBlock()
        return () =>
          h(Suspense, null, {
            default: () =>
              h('main', [h(block, { label: label.value }), h(LaterAsync)]),
          })
      },
    })

  isClient.value = false
  document.body.innerHTML = `<div id="app">${await renderToString(page())}</div>`
  const serverId = document.querySelector('label')!.id
  isClient.value = true
  clientSetups = 0
  clientIds.length = 0
  page().mount('#app')
  await settle()
  return { button: () => document.querySelector('button')!, label, serverId }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('withoutHydration', () => {
  test('a block hydrates without it', async () => {
    const { button } = await hydrate(() => Counter)

    button().click()
    await nextTick()

    expect(clientSetups).toBe(1)
    expect(button().textContent).toBe('Static 1')
  })

  test('keeps the server HTML and never runs the block on the client', async () => {
    const { button } = await hydrate(() => withoutHydration(Counter))

    button().click()
    await nextTick()

    expect(clientSetups).toBe(0)
    expect(document.querySelector('main')!.outerHTML).toMatch(
      /^<main><button>Static 0<\/button><label id="[^"]+"><\/label><\/main>$/,
    )
  })

  test('keeps the ids of later components the same as on the server', async () => {
    const { serverId } = await hydrate(() => withoutHydration(Counter))

    expect(clientIds).toEqual([serverId])
  })

  // Vue can only update a block it didn't hydrate if the block's component
  // wasn't loaded yet when the page hydrated: with one wrapper for all blocks,
  // every page after the first would throw.
  test('renders the block when its props change, on every page', async () => {
    for (let pageLoad = 0; pageLoad < 2; pageLoad++) {
      const { button, label } = await hydrate(() => withoutHydration(Counter))

      label.value = 'Changed'
      await settle()

      expect(document.querySelectorAll('button')).toHaveLength(1)
      expect(button().textContent).toBe('Changed 0')
    }
  })
})
