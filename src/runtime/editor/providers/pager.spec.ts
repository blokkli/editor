import { describe, it, expect } from 'vitest'
import { nextTick, reactive, ref } from 'vue'
import type { MutatedField } from '../types/state'
import pagerProvider from './pager'

// The page's paragraphs hold a slider and a text. The slider's slides are a
// gallery, a text and another gallery; the first gallery holds two images, the
// second one image.
function createTree() {
  return reactive<Record<string, MutatedField>>({
    'page:field_paragraphs': field('page', 'field_paragraphs', [
      'slider',
      'text',
    ]),
    'slider:field_slides': field('slider', 'field_slides', [
      'gallery1',
      'slideText',
      'gallery2',
    ]),
    'gallery1:field_images': field('gallery1', 'field_images', [
      'image1',
      'image2',
    ]),
    'gallery2:field_images': field('gallery2', 'field_images', ['image3']),
  })
}

function field(entityUuid: string, name: string, uuids: string[]) {
  return {
    name,
    entityType: entityUuid === 'page' ? 'node' : 'paragraph',
    entityUuid,
    list: uuids.map((uuid) => ({ uuid })),
  } as MutatedField
}

function createProvider() {
  const tree = createTree()
  const uuids = ref<string[]>([])
  const isDragging = ref(false)
  const state = {
    getFieldListForBlock: (uuid: string) =>
      Object.values(tree).find((field) =>
        field.list.some((item) => item.uuid === uuid),
      ),
  }
  const pager = pagerProvider(state as never, { uuids, isDragging } as never)
  return { pager, tree, uuids, isDragging }
}

function childUuids(tree: Record<string, MutatedField>, key: string) {
  return tree[key]!.list.map((item) => item.uuid)
}

describe('the block a field shows', () => {
  it('is the first one by default, and none in an empty field', () => {
    const { pager } = createProvider()
    expect(pager.getShown('slider:field_slides', ['a', 'b'])).toBe('a')
    expect(pager.getShown('slider:field_slides', [])).toBeNull()
  })

  it('is the one it showed last, wherever it moved to in the field', () => {
    const { pager, tree } = createProvider()
    pager.show('gallery2')
    const slides = tree['slider:field_slides']!.list
    slides.unshift(slides.pop()!)
    expect(
      pager.getShown(
        'slider:field_slides',
        childUuids(tree, 'slider:field_slides'),
      ),
    ).toBe('gallery2')
  })

  it('is the block that took its place when it left the field', () => {
    const { pager, tree } = createProvider()
    pager.show('slideText')
    const slides = tree['slider:field_slides']!.list
    slides.splice(1, 1)
    expect(
      pager.getShown(
        'slider:field_slides',
        childUuids(tree, 'slider:field_slides'),
      ),
    ).toBe('gallery2')
  })

  it('is the last one when it was the last and left the field', () => {
    const { pager } = createProvider()
    pager.show('gallery2')
    expect(
      pager.getShown('slider:field_slides', ['gallery1', 'slideText']),
    ).toBe('slideText')
  })

  it('is the same block again when it comes back, as with an undo', () => {
    const { pager } = createProvider()
    pager.show('slideText')
    const slides = ['gallery1', 'slideText', 'gallery2']
    expect(
      pager.getShown('slider:field_slides', ['gallery1', 'gallery2']),
    ).toBe('gallery2')
    expect(pager.getShown('slider:field_slides', slides)).toBe('slideText')
  })
})

describe('showing a block', () => {
  it('shows the blocks that contain it, in every field above it', () => {
    const { pager } = createProvider()
    pager.show('image2')
    expect(pager.getShown('gallery1:field_images', ['image1', 'image2'])).toBe(
      'image2',
    )
    expect(
      pager.getShown('slider:field_slides', [
        'gallery1',
        'slideText',
        'gallery2',
      ]),
    ).toBe('gallery1')
    expect(pager.getShown('page:field_paragraphs', ['slider', 'text'])).toBe(
      'slider',
    )
  })

  it('leaves the other fields alone', () => {
    const { pager } = createProvider()
    pager.show('image2')
    pager.show('image3')
    expect(pager.getShown('gallery1:field_images', ['image1', 'image2'])).toBe(
      'image2',
    )
    expect(
      pager.getShown('slider:field_slides', [
        'gallery1',
        'slideText',
        'gallery2',
      ]),
    ).toBe('gallery2')
  })
})

describe('following the selection', () => {
  it('shows the selected block and the blocks that contain it', async () => {
    const { pager, uuids } = createProvider()
    uuids.value = ['image3']
    await nextTick()
    expect(pager.getShown('gallery2:field_images', ['image3'])).toBe('image3')
    expect(
      pager.getShown('slider:field_slides', [
        'gallery1',
        'slideText',
        'gallery2',
      ]),
    ).toBe('gallery2')
  })

  it('keeps showing it once something else is selected', async () => {
    const { pager, uuids } = createProvider()
    uuids.value = ['gallery2']
    await nextTick()
    uuids.value = ['text']
    await nextTick()
    expect(
      pager.getShown('slider:field_slides', [
        'gallery1',
        'slideText',
        'gallery2',
      ]),
    ).toBe('gallery2')
  })

  it('changes nothing while several blocks are selected', async () => {
    const { pager, uuids } = createProvider()
    uuids.value = ['slideText']
    await nextTick()
    uuids.value = ['slideText', 'gallery2']
    await nextTick()
    expect(
      pager.getShown('slider:field_slides', [
        'gallery1',
        'slideText',
        'gallery2',
      ]),
    ).toBe('slideText')
  })

  it('waits until a drag ends: the block below the band stays put', async () => {
    const { pager, uuids, isDragging } = createProvider()
    isDragging.value = true
    uuids.value = ['gallery2']
    await nextTick()
    expect(
      pager.getShown('slider:field_slides', [
        'gallery1',
        'slideText',
        'gallery2',
      ]),
    ).toBe('gallery1')

    isDragging.value = false
    await nextTick()
    expect(
      pager.getShown('slider:field_slides', [
        'gallery1',
        'slideText',
        'gallery2',
      ]),
    ).toBe('gallery2')
  })

  it('shows the selected block in the field it was moved to', async () => {
    const { pager, tree, uuids } = createProvider()
    uuids.value = ['image1']
    await nextTick()
    tree['gallery1:field_images']!.list.shift()
    tree['gallery2:field_images']!.list.push({ uuid: 'image1' } as never)
    await nextTick()
    expect(pager.getShown('gallery2:field_images', ['image3', 'image1'])).toBe(
      'image1',
    )
    expect(
      pager.getShown('slider:field_slides', [
        'gallery1',
        'slideText',
        'gallery2',
      ]),
    ).toBe('gallery2')
  })
})

describe('holding the selection', () => {
  it('is true for the selected blocks and the blocks that contain them', () => {
    const { pager, uuids } = createProvider()
    uuids.value = ['image2', 'text']
    for (const uuid of ['image2', 'gallery1', 'slider', 'text']) {
      expect(pager.holdsSelection(uuid)).toBe(true)
    }
    for (const uuid of ['image1', 'slideText', 'gallery2', 'image3']) {
      expect(pager.holdsSelection(uuid)).toBe(false)
    }
  })
})
