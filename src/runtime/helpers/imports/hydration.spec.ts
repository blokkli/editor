// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest'
import { Suspense, createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
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

const settle = () => new Promise((resolve) => setTimeout(resolve))

/**
 * Renders the page on the "server" with the block itself, then hydrates the
 * server HTML on the "client" with the block the callback returns, inside
 * <Suspense> like Nuxt does.
 */
async function hydrate(clientBlock: () => Component) {
  const label = ref('Static')
  const page = (block: () => Component) =>
    createSSRApp({
      setup: () => () =>
        h(Suspense, null, {
          default: () => h('main', [h(block(), { label: label.value })]),
        }),
    })

  isClient.value = false
  document.body.innerHTML = `<div id="app">${await renderToString(page(() => Counter))}</div>`
  isClient.value = true
  clientSetups = 0
  page(clientBlock).mount('#app')
  await settle()
  return { button: () => document.querySelector('button')!, label }
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
    expect(document.querySelector('main')!.outerHTML).toBe(
      '<main><button>Static 0</button></main>',
    )
  })

  // Vue can only update a block it didn't hydrate if the block's component
  // wasn't loaded yet when the page hydrated: the second page would throw.
  test.each(['first', 'second'])(
    'renders the block when its props change, on the %s page',
    async () => {
      const { button, label } = await hydrate(() => withoutHydration(Counter))

      label.value = 'Changed'
      await settle()

      expect(document.querySelectorAll('button')).toHaveLength(1)
      expect(button().textContent).toBe('Changed 0')
    },
  )
})
