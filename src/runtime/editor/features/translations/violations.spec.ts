// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { getViolationText, matchViolationsToTexts } from './violations'

const TITLE = 'a4f1b3c2-0000-4000-8000-000000000001'
const LINK = 'a4f1b3c2-0000-4000-8000-000000000002'
const PAGE = 'a4f1b3c2-0000-4000-8000-000000000003'

const KEYS = [
  `${TITLE}:field_title`,
  `${LINK}:field_link.title`,
  `${PAGE}:title`,
]

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
      KEYS,
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
      KEYS,
    )

    expect([...messages]).toEqual([
      [`${TITLE}:field_title`, 'Title: may not be longer than 255 characters.'],
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
      KEYS,
    )

    expect([...messages.keys()]).toEqual([`${LINK}:field_link.title`])
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
      KEYS,
    )

    expect([...messages.keys()]).toEqual([`${PAGE}:title`])
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
      KEYS,
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
      KEYS,
    )

    expect(messages.size).toBe(0)
    expect(unmatched).toEqual([other, unknown, entity, nobody])
  })
})
