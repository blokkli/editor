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

  describe('when the list of blocks is reordered', () => {
    const roots = {
      one: (text: string) => h('p', text),
      several: (text: string) => h(Fragment, [h('p', text), h('hr')]),
    }

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
      const page = () =>
        createSSRApp({
          setup: () => () =>
            h(Suspense, null, {
              default: () =>
                h(
                  'main',
                  items.value.map((text) =>
                    h(Item, { key: text, text, block: Block }),
                  ),
                ),
            }),
        })
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

      isClient.value = false
      document.body.innerHTML = `<div id="app">${await renderToString(page())}</div>`
      isClient.value = true
      clientSetups = 0
      page().mount('#app')
      await settle()
      items.value = ['b', 'a']
      await settle()
      return document.querySelector('main')!.textContent
    }

    test('moves blocks with one root element without hydrating them', async () => {
      expect(await reorder(roots.one)).toBe('ba')
      expect(clientSetups).toBe(0)
    })

    // Vue can't move a block it didn't hydrate when it has several root
    // elements.
    test('hydrates blocks with several root elements, so they can move', async () => {
      expect(await reorder(roots.several)).toBe('ba')
      expect(clientSetups).toBe(2)
    })
  })
})
