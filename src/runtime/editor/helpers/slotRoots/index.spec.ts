// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createApp, defineComponent, nextTick, reactive } from 'vue'
import { withRootProps } from './index'

// Renders its slot the way the editor's slot item does: the slot function
// called in a render function, the first element marked "first", every other
// root element marked "other".
const Item = defineComponent({
  setup(_, { slots }) {
    return () =>
      withRootProps(
        slots.default?.() ?? [],
        { 'data-first': '', class: 'is-first' },
        { 'data-other': '' },
      )
  },
})

const Child = defineComponent({
  template: '<section class="child"><slot /></section>',
})

// Passes its own slot on to <Item> with <slot>, as <BlokkliItem> passes the
// project's markup to the editor's slot item.
const Wrapper = defineComponent({
  components: { Item },
  template: '<Item><slot /></Item>',
})

/**
 * Mount a template that uses <Item>, compiled at runtime, with a reactive
 * state.
 */
function mount<T extends object>(template: string, state: T) {
  const root = document.createElement('div')
  const app = createApp(
    defineComponent({
      components: { Item, Child, Wrapper },
      setup: () => state,
      template,
    }),
  )
  app.mount(root)
  return {
    first: () => [...root.querySelectorAll('[data-first]')],
    others: () => [...root.querySelectorAll('[data-other]')],
    root,
  }
}

describe('withRootProps', () => {
  it('marks a static first element', () => {
    const { first, others } = mount('<Item><div class="a">A</div></Item>', {})
    expect(first().map((el) => el.className)).toEqual(['a is-first'])
    expect(others()).toEqual([])
  })

  it('keeps the props across renders of a dynamic element', async () => {
    const state = reactive({ cls: 'a', text: 'one' })
    const { first, root } = mount(
      '<Item><div :class="cls">{{ text }}</div></Item>',
      state,
    )
    state.cls = 'b'
    state.text = 'two'
    await nextTick()
    expect(first().map((el) => el.className)).toEqual(['b is-first'])
    expect(root.textContent).toBe('two')
  })

  it('marks whichever branch v-if renders', async () => {
    const state = reactive({ on: true })
    const { first } = mount(
      '<Item><div v-if="on" class="on" /><span v-else class="off" /></Item>',
      state,
    )
    expect(first().map((el) => el.tagName)).toEqual(['DIV'])
    state.on = false
    await nextTick()
    expect(first().map((el) => el.tagName)).toEqual(['SPAN'])
  })

  it('skips the comment of an element that v-if leaves out', () => {
    const { first } = mount(
      '<Item><div v-if="false" class="gone" /><div class="a" /></Item>',
      {},
    )
    expect(first().map((el) => el.className)).toEqual(['a is-first'])
  })

  it('goes into a <template v-if>', async () => {
    const state = reactive({ on: false })
    const { first, others } = mount(
      '<Item><template v-if="on"><div class="a" /><div class="b" /></template></Item>',
      state,
    )
    expect(first()).toEqual([])
    state.on = true
    await nextTick()
    expect(first().map((el) => el.classList[0])).toEqual(['a'])
    expect(others().map((el) => el.className)).toEqual(['b'])
  })

  it('marks the first of a v-for, also when the list changes', async () => {
    const state = reactive({ items: [1, 2, 3] })
    const { first, others } = mount(
      '<Item><div v-for="i in items" :key="i" :class="\'i\' + i" /></Item>',
      state,
    )
    expect(first().map((el) => el.classList[0])).toEqual(['i1'])
    expect(others().map((el) => el.className)).toEqual(['i2', 'i3'])
    state.items = [3, 1]
    await nextTick()
    expect(first().map((el) => el.classList[0])).toEqual(['i3'])
    expect(others().map((el) => el.className)).toEqual(['i1'])
  })

  it("gives a component's root the props", () => {
    const { first } = mount('<Item><Child>Text</Child></Item>', {})
    expect(first().map((el) => el.tagName)).toEqual(['SECTION'])
  })

  it('marks the markup of a slot passed on with <slot>, also across renders', async () => {
    const state = reactive({ cls: 'a', on: true, items: [1, 2] })
    const { first, others, root } = mount(
      `<Wrapper>
        <div :class="cls">
          <span v-if="on">on</span>
          <b v-for="i in items" :key="i">{{ i }}</b>
        </div>
        <p>after</p>
      </Wrapper>`,
      state,
    )
    state.cls = 'b'
    state.on = false
    state.items = [2, 3, 4]
    await nextTick()
    expect(first().map((el) => el.className)).toEqual(['b is-first'])
    expect(others().map((el) => el.tagName)).toEqual(['P'])
    expect(root.querySelector('div')!.textContent!.replace(/\s/g, '')).toBe(
      '234',
    )
  })

  it('marks several root elements', () => {
    const { first, others } = mount(
      '<Item><div class="a" /><div class="b" /><div class="c" /></Item>',
      {},
    )
    expect(first().map((el) => el.classList[0])).toEqual(['a'])
    expect(others().map((el) => el.className)).toEqual(['b', 'c'])
  })
})
