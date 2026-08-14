// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { itemEntityType } from '#blokkli-build/config'
import fieldValueProvider, { type TextFieldValue } from './fieldValue'

const ENTITY_TYPE = 'content'

/**
 * Build a provider whose rendered read always resolves to `rendered`, so any
 * test that gets that string back proves the raw path fell through.
 */
function createProvider(options: {
  textFieldValues?: TextFieldValue[]
  /** Block uuids the mapped state walked. */
  knownBlocks?: string[]
  rendered?: string
}) {
  const rendered = options.rendered ?? '<p>RENDERED</p>'
  const element = document.createElement('div')
  element.innerHTML = rendered

  const knownBlocks = new Set(options.knownBlocks ?? [])

  const directive = {
    findEditableElement: () => element,
    findEditable: () => undefined,
  }
  const state = {
    getMappedState: () => ({ textFieldValues: options.textFieldValues }),
    getFieldListItem: (uuid: string) =>
      knownBlocks.has(uuid) ? { uuid, props: {} } : undefined,
    mutatedEntity: { value: {} },
  }
  const types = {
    editableFieldConfig: {
      forName: () => ({ type: 'markup' }),
    },
  }
  const definitions = {
    getProviderDefinition: () => undefined,
    getBlockDefinition: () => undefined,
  }
  const blocks = { getBlock: () => undefined }

  return fieldValueProvider(
    directive as never,
    state as never,
    types as never,
    definitions as never,
    blocks as never,
  )
}

function value(uuid: string, fieldName: string, v: string): TextFieldValue {
  return {
    uuid,
    fieldName,
    value: v,
    fieldType: 'markup',
    entityType: itemEntityType,
    entityBundle: 'text',
  }
}

describe('readRawValue', () => {
  it('returns the stored value when the adapter exposes it', () => {
    const provider = createProvider({
      textFieldValues: [value('block-1', 'text', '<p>STORED</p>')],
      knownBlocks: ['block-1'],
    })
    expect(
      provider.readRawValue(
        itemEntityType,
        'block-1',
        'text',
        'text',
        'markup',
      ),
    ).toBe('<p>STORED</p>')
  })

  it('reports an empty field as empty even when the block has no stored values at all', () => {
    // Adapters emit a row per NON-EMPTY field, so a block whose text fields are
    // all empty contributes no rows. Inferring coverage from row presence would
    // send it down the rendered path, where a template placeholder
    // (`{{ title || 'Learn more' }}`) reads back as authored content.
    const provider = createProvider({
      textFieldValues: [value('block-other', 'text', '<p>STORED</p>')],
      knownBlocks: ['block-other', 'block-empty'],
      rendered: '<p>Learn more</p>',
    })
    expect(
      provider.readRawValue(
        itemEntityType,
        'block-empty',
        'text',
        'text',
        'markup',
      ),
    ).toBe('')
  })

  it('reports an absent field as empty when a sibling field is present', () => {
    const provider = createProvider({
      textFieldValues: [value('block-1', 'title', 'Titel')],
      knownBlocks: ['block-1'],
    })
    expect(
      provider.readRawValue(
        itemEntityType,
        'block-1',
        'text',
        'text',
        'markup',
      ),
    ).toBe('')
  })

  it('falls back to the rendered value when the adapter exposes an empty array', () => {
    // The Drupal adapter maps missing data to `[]`, so treating an empty array
    // as "raw values are available" would silently serve every field from the
    // DOM — the exact bug this path exists to prevent — with no warning.
    const provider = createProvider({
      textFieldValues: [],
      knownBlocks: ['block-1'],
    })
    expect(
      provider.readRawValue(
        itemEntityType,
        'block-1',
        'text',
        'text',
        'markup',
      ),
    ).toBe('<p>RENDERED</p>')
  })

  it('falls back to the rendered value when the adapter exposes nothing', () => {
    const provider = createProvider({ knownBlocks: ['block-1'] })
    expect(
      provider.readRawValue(
        itemEntityType,
        'block-1',
        'text',
        'text',
        'markup',
      ),
    ).toBe('<p>RENDERED</p>')
  })

  it('falls back to the rendered value for a block the mapped state never walked', () => {
    const provider = createProvider({
      textFieldValues: [value('block-1', 'text', '<p>STORED</p>')],
      knownBlocks: ['block-1'],
    })
    expect(
      provider.readRawValue(
        itemEntityType,
        'block-unwalked',
        'text',
        'text',
        'markup',
      ),
    ).toBe('<p>RENDERED</p>')
  })

  it('treats the host entity as covered, so an absent field reads as empty', () => {
    const provider = createProvider({
      textFieldValues: [value('block-1', 'text', '<p>STORED</p>')],
      knownBlocks: ['block-1'],
    })
    expect(
      provider.readRawValue(ENTITY_TYPE, 'entity-1', 'page', 'lead', 'markup'),
    ).toBe('')
  })
})
