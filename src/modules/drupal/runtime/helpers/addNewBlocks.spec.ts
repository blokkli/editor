import { describe, expect, test } from 'vitest'
import { mapBlockToGraphQL } from './addNewBlocks'

const media = { entityType: 'media', entityId: '5' }

describe('mapBlockToGraphQL', () => {
  test('maps each value by the type of its field', () => {
    const config = [
      {
        type: 'reference',
        name: 'field_media',
        entityType: 'paragraph',
        entityBundle: 'teaser',
      },
      {
        type: 'link',
        name: 'field_link',
        entityType: 'paragraph',
        entityBundle: 'teaser',
      },
    ]
    const input = mapBlockToGraphQL(
      {
        bundle: 'teaser',
        blockUuid: 'a',
        values: [
          { fieldName: 'field_media', fieldValue: media },
          { fieldName: 'field_link', fieldValue: media },
          { fieldName: 'field_title', fieldValue: 'Title' },
        ],
      },
      config,
    )
    expect(input.values).toEqual({
      field_media: { target_id: '5' },
      field_link: 'entity:media/5',
      field_title: 'Title',
    })
  })

  test("takes a paragraph type's field, not the host's of the same names", () => {
    // A content type and a paragraph type are both named "event". The config
    // lists the host's fields first.
    const config = [
      {
        type: 'reference',
        name: 'field_link',
        entityType: 'node',
        entityBundle: 'event',
      },
      {
        type: 'reference',
        name: 'field_text',
        entityType: 'node',
        entityBundle: 'event',
      },
      {
        type: 'link',
        name: 'field_link',
        entityType: 'paragraph',
        entityBundle: 'event',
      },
    ]
    const input = mapBlockToGraphQL(
      {
        bundle: 'event',
        blockUuid: 'a',
        values: [
          { fieldName: 'field_link', fieldValue: media },
          { fieldName: 'field_text', fieldValue: 'Text' },
        ],
      },
      config,
    )
    expect(input.values).toEqual({
      field_link: 'entity:media/5',
      field_text: 'Text',
    })
  })

  test('maps the children with the same config', () => {
    const config = [
      {
        type: 'reference',
        name: 'field_media',
        entityType: 'paragraph',
        entityBundle: 'image',
      },
    ]
    const input = mapBlockToGraphQL(
      {
        bundle: 'grid',
        blockUuid: 'a',
        children: {
          field_items: [
            {
              bundle: 'image',
              blockUuid: 'b',
              values: [{ fieldName: 'field_media', fieldValue: media }],
            },
          ],
        },
      },
      config,
    )
    expect(input.children).toEqual([
      {
        fieldName: 'field_items',
        items: [
          {
            bundle: 'image',
            uuid: 'b',
            values: { field_media: { target_id: '5' } },
            options: undefined,
            children: undefined,
          },
        ],
      },
    ])
  })
})
