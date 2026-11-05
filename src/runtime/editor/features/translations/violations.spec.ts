// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { getViolationText, matchViolationsToTexts } from './violations'

const TITLE = 'a4f1b3c2-0000-4000-8000-000000000001'
const LINK = 'a4f1b3c2-0000-4000-8000-000000000002'
const PAGE = 'a4f1b3c2-0000-4000-8000-000000000003'

const TEXTS = [
  { key: `${TITLE}:field_title` },
  { key: `${LINK}:field_link.title` },
  { key: `${PAGE}:title` },
]

/** The keys of the texts that the violations are about. */
function keysOf(messages: Map<{ key: string }, string>): string[] {
  return [...messages.keys()].map((text) => text.key)
}

describe('getViolationText', () => {
  it('keeps a plain message', () => {
    expect(
      getViolationText({ message: 'This value should not be null.' }),
    ).toBe('This value should not be null.')
  })

  it('takes the markup out of a message', () => {
    expect(
      getViolationText({
        message:
          '<em class="placeholder">Title</em>: may not be longer than 255 characters.',
      }),
    ).toBe('Title: may not be longer than 255 characters.')
    expect(getViolationText({ message: 'Text &amp; title' })).toBe(
      'Text & title',
    )
  })
})

describe('matchViolationsToTexts', () => {
  it('says it as plain text', () => {
    const { messages } = matchViolationsToTexts(
      [
        {
          message: '<em class="placeholder">Title</em>: too long.',
          propertyPath: 'field_title.0.value',
          entityUuid: TITLE,
        },
      ],
      TEXTS,
    )

    expect([...messages.values()]).toEqual(['Title: too long.'])
  })

  it('finds the text of a field', () => {
    const { messages, unmatched } = matchViolationsToTexts(
      [
        {
          message: 'Title: may not be longer than 255 characters.',
          propertyPath: 'field_title.0.value',
          entityType: 'paragraph',
          entityUuid: TITLE,
        },
      ],
      TEXTS,
    )

    expect([...messages]).toEqual([
      [TEXTS[0], 'Title: may not be longer than 255 characters.'],
    ])
    expect(unmatched).toEqual([])
  })

  it('finds a property that is a text of its own', () => {
    const { messages } = matchViolationsToTexts(
      [
        {
          message: 'Too long.',
          propertyPath: 'field_link.0.title',
          entityUuid: LINK,
        },
      ],
      TEXTS,
    )

    expect(keysOf(messages)).toEqual([`${LINK}:field_link.title`])
  })

  it("finds the host entity's own text", () => {
    const { messages } = matchViolationsToTexts(
      [
        {
          message: 'Too long.',
          propertyPath: 'title.0.value',
          entityUuid: PAGE,
        },
      ],
      TEXTS,
    )

    expect(keysOf(messages)).toEqual([`${PAGE}:title`])
  })

  it('keeps the first message of a text', () => {
    const { messages } = matchViolationsToTexts(
      [
        {
          message: 'First.',
          propertyPath: 'field_title.0.value',
          entityUuid: TITLE,
        },
        {
          message: 'Second.',
          propertyPath: 'field_title.0',
          entityUuid: TITLE,
        },
      ],
      TEXTS,
    )

    expect([...messages.values()]).toEqual(['First.'])
  })

  it('returns what is about none of the texts', () => {
    const other = {
      message: 'Another field.',
      propertyPath: 'field_lead.0.value',
      entityUuid: TITLE,
    }
    const unknown = {
      message: 'Another entity.',
      propertyPath: 'field_title.0.value',
      entityUuid: 'a4f1b3c2-0000-4000-8000-000000000009',
    }
    const entity = { message: 'The entity as a whole.', entityUuid: TITLE }
    const nobody = {
      message: 'No entity.',
      propertyPath: 'field_title.0.value',
    }

    const { messages, unmatched } = matchViolationsToTexts(
      [other, unknown, entity, nobody],
      TEXTS,
    )

    expect(messages.size).toBe(0)
    expect(unmatched).toEqual([other, unknown, entity, nobody])
  })

  it('finds the text in the language of the violation', () => {
    const german = { key: `${TITLE}:field_title`, langcode: 'de' }
    const french = { key: `${TITLE}:field_title`, langcode: 'fr' }
    const violation = (langcode: string) => ({
      message: `Too long in ${langcode}.`,
      propertyPath: 'field_title.0.value',
      entityUuid: TITLE,
      langcode,
    })

    expect([
      ...matchViolationsToTexts([violation('fr')], [german, french]).messages,
    ]).toEqual([[french, 'Too long in fr.']])
    expect([
      ...matchViolationsToTexts(
        [violation('fr'), violation('de')],
        [german, french],
      ).messages,
    ]).toEqual([
      [french, 'Too long in fr.'],
      [german, 'Too long in de.'],
    ])
  })

  it('takes the first text of a field for a violation in another language', () => {
    // A block whose type isn't translatable has one language.
    const german = { key: `${TITLE}:field_title`, langcode: 'de' }
    const french = { key: `${TITLE}:field_title`, langcode: 'fr' }

    const { messages, unmatched } = matchViolationsToTexts(
      [
        {
          message: 'Too long.',
          propertyPath: 'field_title.0.value',
          entityUuid: TITLE,
          langcode: 'en',
        },
      ],
      [german, french],
    )

    expect([...messages]).toEqual([[german, 'Too long.']])
    expect(unmatched).toEqual([])
  })
})
