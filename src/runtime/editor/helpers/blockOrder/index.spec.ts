import { describe, it, expect } from 'vitest'
import { orderBlockElements } from './index'

type FakeElement = { uuid?: string; parent: FakeElement | null }

/**
 * Builds elements in document order from an indented outline: two spaces per
 * level of nesting, and `-` for an element without a uuid.
 */
function outline(text: string): FakeElement[] {
  const elements: FakeElement[] = []
  const stack: FakeElement[] = []
  for (const line of text.split('\n')) {
    if (!line.trim()) {
      continue
    }
    const depth = (line.length - line.trimStart().length) / 2
    const name = line.trim()
    stack.length = depth
    const element: FakeElement = {
      uuid: name === '-' ? undefined : name,
      parent: stack[depth - 1] ?? null,
    }
    stack.push(element)
    elements.push(element)
  }
  return elements
}

function contains(element: FakeElement, other: FakeElement): boolean {
  for (let parent = other.parent; parent; parent = parent.parent) {
    if (parent === element) {
      return true
    }
  }
  return false
}

function order(text: string): string[] {
  return orderBlockElements(outline(text), (el) => el.uuid, contains)
}

describe('the order of the blocks', () => {
  it('is the document order', () => {
    expect(
      order(`
title
columns
  left
  right
    image
text
`),
    ).toEqual(['title', 'columns', 'left', 'right', 'image', 'text'])
  })

  it('skips elements without a uuid', () => {
    expect(
      order(`
title
-
  text
`),
    ).toEqual(['title', 'text'])
  })

  it('puts a shown block without content where its page is', () => {
    // A slider of three images, the second one shown: the band's pages, then
    // the real image below the band.
    expect(
      order(`
slider
  image1
  image2
  image3
  image2
text
`),
    ).toEqual(['slider', 'image1', 'image2', 'image3', 'text'])
  })

  it('puts the blocks inside the shown block right after its page', () => {
    expect(
      order(`
slider
  slide1
  slide2
  slide3
  slide2
    title
    teaser
text
`),
    ).toEqual([
      'slider',
      'slide1',
      'slide2',
      'title',
      'teaser',
      'slide3',
      'text',
    ])
  })

  it('does the same for a pager inside the shown block', () => {
    // The second slide holds a gallery that shows its first image.
    expect(
      order(`
slider
  slide1
  slide2
  slide2
    gallery
      image1
      image2
      image1
`),
    ).toEqual(['slider', 'slide1', 'slide2', 'gallery', 'image1', 'image2'])
  })

  it('works with the shown page first or last', () => {
    expect(
      order(`
slide1
slide2
slide1
  text1
`),
    ).toEqual(['slide1', 'text1', 'slide2'])
    expect(
      order(`
slide1
slide2
slide2
  text2
`),
    ).toEqual(['slide1', 'slide2', 'text2'])
  })

  it('keeps the first element of a block that comes twice without a page', () => {
    expect(
      order(`
text
image
text
`),
    ).toEqual(['text', 'image'])
  })
})
