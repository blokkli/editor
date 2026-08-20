// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import {
  Suspense,
  createApp,
  defineAsyncComponent,
  defineComponent,
  h,
  nextTick,
  ref,
  type Ref,
} from 'vue'
import { useBlockRegistration } from './useBlockRegistration'
import type { DomProvider } from '../providers/dom'

const UUID = 'a4f1b3c2-0000-4000-8000-000000000001'

type Registration = { key: string; uuid: string; el: HTMLElement | null }

function createDomMock() {
  const registrations: Registration[] = []
  const unregistered: string[] = []

  const dom = {
    registerBlock: (key: string, uuid: string, el: HTMLElement | null) =>
      registrations.push({ key, uuid, el }),
    unregisterBlock: (key: string) => unregistered.push(key),
  } as unknown as DomProvider

  return { dom, registrations, unregistered }
}

/**
 * Flush pending microtasks and render effects.
 *
 * An async setup component resolves over multiple microtask ticks before its
 * subtree is patched into the DOM.
 */
async function flush() {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve()
    await nextTick()
  }
}

/**
 * A child component whose element is only rendered after its async setup
 * resolves. Mirrors a `<script setup>` block with a top level `await`.
 */
const AsyncChild = defineComponent({
  name: 'AsyncChild',
  async setup(_props, { expose }) {
    const blokkliDraggable: Ref<HTMLElement | null> = ref(null)
    // `defineExpose()` is compiled to a synchronous call before the await.
    expose({ blokkliDraggable })
    await Promise.resolve()
    return () =>
      h('div', { ref: blokkliDraggable, class: 'async-child' }, 'content')
  },
})

const SyncChild = defineComponent({
  name: 'SyncChild',
  setup(_props, { expose }) {
    const blokkliDraggable: Ref<HTMLElement | null> = ref(null)
    expose({ blokkliDraggable })
    return () =>
      h('div', { ref: blokkliDraggable, class: 'sync-child' }, 'content')
  },
})

/**
 * A child component whose chunk only resolves after mount, as produced by a
 * `<LazyFoo>` component.
 */
const LazyChild = defineAsyncComponent(() => Promise.resolve(SyncChild))

/**
 * Mount a block that renders `child` with a `blokkliDraggable` template ref.
 *
 * The block is added to the tree *after* the root <Suspense> has resolved and
 * from a component below the boundary, which is what happens in the editor when
 * a field list renders a block. That way the new async dependency does not
 * create a new pending branch for the <Suspense>: the async child mounts on its
 * own once its setup resolves, without the block being updated.
 */
async function mountBlock(child: any) {
  const { dom, registrations, unregistered } = createDomMock()

  const Block = defineComponent({
    name: 'Block',
    setup() {
      useBlockRegistration(dom, UUID)
      return () => h(child, { ref: 'blokkliDraggable' })
    },
  })

  const show = ref(false)

  const Wrapper = defineComponent({
    name: 'Wrapper',
    setup() {
      return () => (show.value ? h(Block) : h('span', 'empty'))
    },
  })

  const Root = defineComponent({
    setup() {
      return () => h(Suspense, null, { default: () => h(Wrapper) })
    },
  })

  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(Root)
  app.mount(host)

  await flush()

  show.value = true
  await flush()

  return {
    registrations,
    unregistered,
    host,
    unmount: () => app.unmount(),
  }
}

describe('useBlockRegistration', () => {
  it('registers the element of a synchronous child component', async () => {
    const { registrations, host } = await mountBlock(SyncChild)

    expect(registrations).toHaveLength(1)
    expect(registrations[0]!.el).toBe(host.querySelector('.sync-child'))
  })

  it('registers the element of a child component with async setup', async () => {
    const { registrations, host } = await mountBlock(AsyncChild)

    const el = host.querySelector('.async-child')
    expect(el).toBeInstanceOf(HTMLElement)
    expect(registrations.map((v) => v.el)).toContain(el)
  })

  it('registers the element of a lazily loaded child component', async () => {
    const { registrations, host } = await mountBlock(LazyChild)

    const el = host.querySelector('.sync-child')
    expect(el).toBeInstanceOf(HTMLElement)
    expect(registrations.map((v) => v.el)).toContain(el)
  })

  it('registers an async block exactly once', async () => {
    const { registrations, host } = await mountBlock(AsyncChild)

    // Once the element is there, further DOM changes around the block must not
    // register it again.
    host.appendChild(document.createElement('div'))
    await flush()

    expect(registrations).toHaveLength(1)
  })

  it('unregisters an async block when it is unmounted', async () => {
    const { registrations, unregistered, unmount } =
      await mountBlock(AsyncChild)

    unmount()
    await flush()

    expect(unregistered).toEqual([registrations[0]!.key])
  })
})
