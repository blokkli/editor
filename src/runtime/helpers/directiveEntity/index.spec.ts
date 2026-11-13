// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { EntityContext } from '#blokkli/types'
import {
  findSlotItem,
  resolveDirectiveEntity,
  SLOT_ITEM_ATTRIBUTE,
  SLOT_ITEM_SHOWN_ATTRIBUTE,
  type SlotItemMarker,
} from './index'

// A story (S) in proxy mode with a slot. Its sections: an accordion (A), a
// teaser (B) and a library item (L). The accordion holds a text (N) and another
// story (T), whose section is a teaser (C).
const HOSTS: Record<string, string> = {
  A: 'S',
  B: 'S',
  L: 'S',
  N: 'A',
  T: 'A',
  C: 'T',
}

const BUNDLES: Record<string, string> = {
  S: 'story',
  A: 'accordion',
  B: 'teaser',
  L: 'from_library',
  N: 'text',
  T: 'story',
  C: 'teaser',
}

function context(uuid: string): EntityContext {
  return { uuid, type: 'paragraph', bundle: BUNDLES[uuid]! }
}

function resolve(
  owner: string | undefined,
  slotItem: SlotItemMarker | null,
): EntityContext | null {
  return resolveDirectiveEntity({
    owner: owner ? context(owner) : undefined,
    slotItem,
    getHostUuid: (uuid) => HOSTS[uuid],
    getBundle: (uuid) => BUNDLES[uuid],
    itemEntityType: 'paragraph',
    fromLibraryBundle: 'from_library',
  })
}

describe('resolveDirectiveEntity', () => {
  it("gives the scene's markup in the shown block that block", () => {
    expect(resolve('S', { uuid: 'A', isShown: true })).toEqual(context('A'))
  })

  it("leaves out the scene's markup in a block that isn't shown", () => {
    expect(resolve('S', { uuid: 'B', isShown: false })).toBeNull()
  })

  it('keeps the context of a block nested in the shown block', () => {
    expect(resolve('N', { uuid: 'A', isShown: true })).toEqual(context('N'))
  })

  it("keeps the context of the scene's decoration", () => {
    expect(resolve('S', null)).toEqual(context('S'))
  })

  it('gives the markup of a nested scene its own shown block', () => {
    expect(resolve('T', { uuid: 'C', isShown: true })).toEqual(context('C'))
  })

  it("keeps the context of a nested scene's own markup", () => {
    expect(resolve('T', { uuid: 'A', isShown: true })).toEqual(context('T'))
  })

  it('leaves out the markup of a shown library item', () => {
    expect(resolve('S', { uuid: 'L', isShown: true })).toBeNull()
  })

  it('edits nothing without a context', () => {
    expect(resolve(undefined, { uuid: 'A', isShown: true })).toBeNull()
    expect(resolve(undefined, null)).toBeNull()
  })
})

describe('findSlotItem', () => {
  function element(html: string): HTMLElement {
    document.body.innerHTML = html
    return document.querySelector<HTMLElement>('[data-test="target"]')!
  }

  it('reads the closest marked element', () => {
    const target = element(
      `<div ${SLOT_ITEM_ATTRIBUTE}="A" ${SLOT_ITEM_SHOWN_ATTRIBUTE}>
        <div ${SLOT_ITEM_ATTRIBUTE}="C"><h2 data-test="target"></h2></div>
      </div>`,
    )
    expect(findSlotItem(target)).toEqual({ uuid: 'C', isShown: false })
  })

  it('reads whether the block is shown', () => {
    const target = element(
      `<div ${SLOT_ITEM_ATTRIBUTE}="A" ${SLOT_ITEM_SHOWN_ATTRIBUTE}>
        <h2 data-test="target"></h2>
      </div>`,
    )
    expect(findSlotItem(target)).toEqual({ uuid: 'A', isShown: true })
  })

  it('finds nothing outside a marked element', () => {
    expect(findSlotItem(element('<h2 data-test="target"></h2>'))).toBeNull()
  })
})
