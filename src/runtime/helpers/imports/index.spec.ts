import { describe, expect, test, vi } from 'vitest'
import { defineComponent } from 'vue'
import type { Component } from 'vue'
import { getComponent } from './index'

const { Text, TextInList, Accordion, QuickLinks } = vi.hoisted(() => ({
  Text: { name: 'Text' },
  TextInList: { name: 'TextInList' },
  Accordion: { name: 'Accordion' },
  QuickLinks: { name: 'QuickLinks' },
}))

vi.mock('#blokkli-build/imports', () => ({
  chunks: {
    global: {
      'block:text': Text,
      'block:text__p:list': TextInList,
      'block:accordion': Accordion,
      'fragment:quick_links': QuickLinks,
    },
  },
  chunkMapping: {
    'block:text': 'global',
    'block:text__p:list': 'global',
    'block:accordion': 'global',
    'fragment:quick_links': 'global',
  },
  hydrationMapping: {
    'block:text': 'never',
    'block:text__p:list': 'never',
    'fragment:quick_links': 'never',
  },
}))

/** The component Vue renders: the block itself, or what a wrapper loads. */
async function rendered(component: any): Promise<Component> {
  return component.__asyncLoader ? await component.__asyncLoader() : component
}

const isWrapped = (component: any) => !!component.__asyncLoader

describe('getComponent', () => {
  test('wraps a block that is never hydrated', async () => {
    const component = getComponent('block', 'text', {})

    expect(isWrapped(component)).toBe(true)
    expect(await rendered(component)).toBe(Text)
  })

  test('wraps the variation that is rendered', async () => {
    const component = getComponent('block', 'text', {
      parentBundle: 'list',
    })

    expect(await rendered(component)).toBe(TextInList)
  })

  test('wraps a fragment that is never hydrated', async () => {
    const component = getComponent('fragment', 'quick_links', {})

    expect(isWrapped(component)).toBe(true)
    expect(await rendered(component)).toBe(QuickLinks)
  })

  test('leaves a block alone that hydrates', () => {
    expect(getComponent('block', 'accordion', {})).toBe(Accordion)
  })

  test('leaves the editing components alone', () => {
    const EditingText = defineComponent({})

    expect(
      getComponent(
        'block',
        'text',
        {},
        {
          'block:text': EditingText,
        },
      ),
    ).toBe(EditingText)
  })
})
