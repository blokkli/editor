import { describe, expect, test, vi } from 'vitest'
import { defineComponent } from 'vue'
import type { Component } from 'vue'
import { getComponent } from './index'

const { Text, TextInList, Accordion } = vi.hoisted(() => ({
  Text: { name: 'Text' },
  TextInList: { name: 'TextInList' },
  Accordion: { name: 'Accordion' },
}))

vi.mock('#blokkli-build/imports', () => ({
  chunks: {
    global: {
      'block:text': Text,
      'block:text__p:list': TextInList,
      'block:accordion': Accordion,
    },
  },
  chunkMapping: {
    'block:text': 'global',
    'block:text__p:list': 'global',
    'block:accordion': 'global',
  },
  hydrationMapping: {
    'block:text': 'never',
    'block:text__p:list': 'never',
  },
}))

/** The component Vue renders: the block itself, or what a wrapper loads. */
async function rendered(component: any): Promise<Component> {
  return component.__asyncLoader ? await component.__asyncLoader() : component
}

const isWrapped = (component: any) => !!component.__asyncLoader

describe('getComponent', () => {
  test('wraps a block that is never hydrated', async () => {
    const component = getComponent('block', 'text', { applyHydration: true })

    expect(isWrapped(component)).toBe(true)
    expect(await rendered(component)).toBe(Text)
  })

  test('wraps the variation that is rendered', async () => {
    const component = getComponent('block', 'text', {
      parentBundle: 'list',
      applyHydration: true,
    })

    expect(await rendered(component)).toBe(TextInList)
  })

  test('leaves a block alone without the hydration setting applied', () => {
    expect(getComponent('block', 'text', {})).toBe(Text)
  })

  test('leaves a block alone that hydrates', () => {
    expect(getComponent('block', 'accordion', { applyHydration: true })).toBe(
      Accordion,
    )
  })

  test('leaves the editing components alone', () => {
    const EditingText = defineComponent({})

    expect(
      getComponent(
        'block',
        'text',
        { applyHydration: true },
        {
          'block:text': EditingText,
        },
      ),
    ).toBe(EditingText)
  })
})
