import { describe, expect, it, vi } from 'vitest'
import type { FieldListItem } from '#blokkli/types'
import { isVisibleByOptions } from './index'

// Only the text and the fragment "events" opt into the two options. The
// built-in library and fragment blocks opt into none: the first stores a
// reusable block's option values, the second those of its fragment.
vi.mock('#blokkli-build/default-global-options', () => ({
  bundlesWithVisibleLanguage: ['text'],
  bundlesWithHiddenGlobally: ['text'],
  fragmentsWithVisibleLanguage: ['events'],
  fragmentsWithHiddenGlobally: ['events'],
}))
vi.mock('#blokkli-build/config', () => ({
  fromLibraryBlockBundle: 'from_library',
  fragmentBlockBundle: 'blokkli_fragment',
}))
vi.mock('#blokkli-build/runtime-options', () => ({ OPTIONS: {} }))

function item(bundle: string, options: Record<string, unknown>): FieldListItem {
  return { uuid: bundle, bundle, isVisible: true, options, props: {} }
}

/** A fragment block. */
function fragment(
  name: string,
  options: Record<string, unknown>,
): FieldListItem {
  return { ...item('blokkli_fragment', options), props: { name } }
}

/** A block from the library, with the options stored on it. */
function fromLibrary(
  reusable: FieldListItem,
  options: Record<string, unknown>,
): FieldListItem {
  return {
    ...item('from_library', options),
    props: { libraryItem: { block: reusable } },
  }
}

describe('isVisibleByOptions', () => {
  it('hides a block in a language that is not one of its visible ones', () => {
    const text = item('text', { bkVisibleLanguages: 'de,fr' })

    expect(isVisibleByOptions(text, 'de')).toBe(true)
    expect(isVisibleByOptions(text, 'en')).toBe(false)
    expect(isVisibleByOptions(item('text', {}), 'en')).toBe(true)
  })

  it('hides a block that is hidden globally', () => {
    expect(isVisibleByOptions(item('text', { bkHiddenGlobally: '1' }))).toBe(
      false,
    )
  })

  it('ignores the options of a bundle without them', () => {
    const title = item('title', {
      bkVisibleLanguages: 'de',
      bkHiddenGlobally: '1',
    })

    expect(isVisibleByOptions(title, 'en')).toBe(true)
  })

  it('applies the options a block from the library has through its reusable block', () => {
    const text = item('text', {})
    const languages = fromLibrary(text, { bkVisibleLanguages: 'de' })

    expect(isVisibleByOptions(languages, 'de')).toBe(true)
    expect(isVisibleByOptions(languages, 'en')).toBe(false)
    expect(
      isVisibleByOptions(fromLibrary(text, { bkHiddenGlobally: '1' })),
    ).toBe(false)
  })

  it('ignores the options when the reusable block has none', () => {
    const title = fromLibrary(item('title', {}), {
      bkVisibleLanguages: 'de',
      bkHiddenGlobally: '1',
    })

    expect(isVisibleByOptions(title, 'en')).toBe(true)
  })

  it('applies the options a fragment block has through its fragment', () => {
    const languages = fragment('events', { bkVisibleLanguages: 'de' })

    expect(isVisibleByOptions(languages, 'de')).toBe(true)
    expect(isVisibleByOptions(languages, 'en')).toBe(false)
    expect(
      isVisibleByOptions(fragment('events', { bkHiddenGlobally: '1' })),
    ).toBe(false)
  })

  it('ignores the options when the fragment has none', () => {
    const news = fragment('news', {
      bkVisibleLanguages: 'de',
      bkHiddenGlobally: '1',
    })

    expect(isVisibleByOptions(news, 'en')).toBe(true)
  })

  it('applies the options of a reusable fragment block', () => {
    const events = fromLibrary(fragment('events', {}), {
      bkVisibleLanguages: 'de',
    })
    const news = fromLibrary(fragment('news', {}), { bkVisibleLanguages: 'de' })

    expect(isVisibleByOptions(events, 'en')).toBe(false)
    expect(isVisibleByOptions(news, 'en')).toBe(true)
  })

  it('treats a missing item as hidden', () => {
    expect(isVisibleByOptions(undefined)).toBe(false)
  })
})
