import { describe, it, expect } from 'vitest'
import type { PageState } from '../../shared/types'
import { formatPageStateNote } from './pageStateNote'

function state(overrides: Partial<PageState> = {}): PageState {
  return {
    editMode: 'editing',
    entityLanguage: 'en',
    isPublished: null,
    title: 'Test page',
    ...overrides,
  }
}

describe('formatPageStateNote', () => {
  describe('baseline unknown (after a conversation restore)', () => {
    it('states the full context even without a diff', () => {
      const s = state({ editMode: 'translating', entityLanguage: 'de' })
      expect(formatPageStateNote(s, s, { baselineUnknown: true })).toBe(
        '[Editor context: edit mode is "translating", content language is "de". Earlier messages in this conversation may have been written in a different context.]',
      )
    })

    it('includes the published state when the entity is publishable', () => {
      const note = formatPageStateNote(
        undefined,
        state({ isPublished: false }),
        { baselineUnknown: true },
      )
      expect(note).toContain('The page is currently not published.')
    })

    it('omits the published sentence when not publishable', () => {
      const note = formatPageStateNote(undefined, state(), {
        baselineUnknown: true,
      })
      expect(note).not.toContain('published')
    })
  })

  describe('diff against the last announced state', () => {
    it('announces an edit mode change', () => {
      expect(
        formatPageStateNote(
          state({ editMode: 'readonly' }),
          state({ editMode: 'editing' }),
          { baselineUnknown: false },
        ),
      ).toBe(
        '[Editor context changed: edit mode is now "editing" (was "readonly").]',
      )
    })

    it('announces a language change', () => {
      expect(
        formatPageStateNote(
          state({ entityLanguage: 'de' }),
          state({ entityLanguage: 'en' }),
          { baselineUnknown: false },
        ),
      ).toBe(
        '[Editor context changed: content language is now "en" (was "de").]',
      )
    })

    it('announces publish and unpublish', () => {
      expect(
        formatPageStateNote(
          state({ isPublished: false }),
          state({ isPublished: true }),
          { baselineUnknown: false },
        ),
      ).toBe('[Editor context changed: the page is now published.]')
      expect(
        formatPageStateNote(
          state({ isPublished: true }),
          state({ isPublished: false }),
          { baselineUnknown: false },
        ),
      ).toBe('[Editor context changed: the page is now unpublished.]')
    })

    it('does not announce publishable -> not publishable', () => {
      expect(
        formatPageStateNote(
          state({ isPublished: true }),
          state({ isPublished: null }),
          { baselineUnknown: false },
        ),
      ).toBeNull()
    })

    it('joins multiple changes into one note', () => {
      expect(
        formatPageStateNote(
          state({ editMode: 'readonly', entityLanguage: 'de' }),
          state({ editMode: 'editing', entityLanguage: 'en' }),
          { baselineUnknown: false },
        ),
      ).toBe(
        '[Editor context changed: edit mode is now "editing" (was "readonly"); content language is now "en" (was "de").]',
      )
    })

    it('is silent when nothing changed', () => {
      expect(
        formatPageStateNote(state(), state(), { baselineUnknown: false }),
      ).toBeNull()
    })

    it('ignores title changes', () => {
      expect(
        formatPageStateNote(state({ title: 'A' }), state({ title: 'B' }), {
          baselineUnknown: false,
        }),
      ).toBeNull()
    })

    it('is silent without a baseline (fresh conversation)', () => {
      expect(
        formatPageStateNote(undefined, state(), { baselineUnknown: false }),
      ).toBeNull()
    })
  })
})
