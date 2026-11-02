// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest'
import {
  Fragment,
  Suspense,
  createSSRApp,
  defineAsyncComponent,
  defineComponent,
  h,
  nextTick,
  ref,
  useId,
} from 'vue'
import type { Component, VNode } from 'vue'
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
 * Renders the page on the "server", then hydrates its HTML on the "client",
 * inside <Suspense> like Nuxt. Returns the server HTML.
 */
async function renderThenHydrate(main: () => VNode): Promise<string> {
  const page = () =>
    createSSRApp({ render: () => h(Suspense, null, { default: main }) })

  isClient.value = false
  const html = await renderToString(page())
  document.body.innerHTML = `<div id="app">${html}</div>`
  isClient.value = true
  clientSetups = 0
  clientIds.length = 0
  page().mount('#app')
  await settle()
  return html
}

/**
 * A page with one block, resolved once per rendered block on both sides like
 * BlokkliItem does, and an async component after it.
 */
async function hydrate(resolveBlock: () => Component) {
  const label = ref('Static')
  const Page = defineComponent({
    setup() {
      const block = resolveBlock()
      return () => h('main', [h(block, { label: label.value }), h(LaterAsync)])
    },
  })
  const html = await renderThenHydrate(() => h(Page))
  const serverId = /<label id="([^"]+)"/.exec(html)![1]
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

  describe('when the list of blocks is reordered', () => {
    const singleRoot = (text: string) => h('p', text)

    async function reorder(render: (text: string) => any) {
      const Block = defineComponent({
        props: { text: { type: String, required: true } },
        setup(props) {
          if (isClient.value) {
            clientSetups++
          }
          return () => render(props.text)
        },
      })
      const items = ref(['a', 'b'])
      // Resolves the block once, like BlokkliItem.
      const Item = defineComponent({
        props: ['text', 'block'],
        setup(props) {
          const block = isClient.value
            ? withoutHydration(props.block)
            : props.block
          return () => h(block, { text: props.text })
        },
      })

      await renderThenHydrate(() =>
        h(
          'main',
          items.value.map((text) => h(Item, { key: text, text, block: Block })),
        ),
      )
      items.value = ['b', 'a']
      await settle()
      return document.querySelector('main')!.textContent
    }

    test('moves blocks with one root without hydrating them', async () => {
      expect(await reorder(singleRoot)).toBe('ba')
      expect(clientSetups).toBe(0)
    })

    // Vue can't move a block it didn't hydrate when it has several root nodes.
    test.each([
      [
        'several elements',
        (text: string) => h(Fragment, [h('p', text), h('hr')]),
      ],
      [
        'an element and text',
        (text: string) => h(Fragment, [h('p', text), ' ']),
      ],
      ['text only', (text: string) => h(Fragment, [text, ' '])],
    ])(
      'hydrates blocks with %s at the root, so they can move',
      async (_, render) => {
        expect((await reorder(render))?.replace(/\s/g, '')).toBe('ba')
        expect(clientSetups).toBe(2)
      },
    )
  })
})
