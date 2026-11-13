// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createApp, defineComponent } from 'vue'
import type { RegisteredField } from '../types/field'
import type { DomProvider } from './dom'
import type { BlockDefinitionProvider } from './types'
import type { StateProvider } from './state'
import fieldsProvider, { type FieldsProvider } from './fields'

const SLIDER = 'slider'
const FIELD = 'field_slides'

function registration(element: HTMLElement): RegisteredField {
  return {
    element,
    entity: { type: 'paragraph', bundle: 'slider', uuid: SLIDER },
    fieldName: FIELD,
    fieldListType: 'default',
    allowedFragments: [],
    isNested: true,
    nestingLevel: 1,
    dropAlignment: null,
    zIndex: 0,
    isPager: true,
  } as RegisteredField
}

/**
 * The provider, set up in a component as in the editor, with a field
 * registered as the test says.
 */
function createProvider() {
  const registered = new Map<string, RegisteredField>()
  const dom = {
    getRegisteredField: (uuid: string, fieldName: string) =>
      registered.get(uuid + ':' + fieldName),
  } as unknown as DomProvider
  const types = {
    getFieldConfig: () => ({
      label: 'Slides',
      allowedBundles: ['image'],
      cardinality: -1,
    }),
  } as unknown as BlockDefinitionProvider

  let fields: FieldsProvider | undefined
  createApp(
    defineComponent({
      setup() {
        fields = fieldsProvider(dom, types, {} as StateProvider)
        return () => null
      },
    }),
  ).mount(document.createElement('div'))

  return {
    fields: fields!,
    register: (element: HTMLElement) =>
      registered.set(SLIDER + ':' + FIELD, registration(element)),
    unregister: () => registered.delete(SLIDER + ':' + FIELD),
  }
}

describe('a field found by its host and name', () => {
  it('is the same while its registration is', () => {
    const { fields, register } = createProvider()
    register(document.createElement('div'))
    expect(fields.find(SLIDER, FIELD)).toBe(fields.find(SLIDER, FIELD))
  })

  it('has the element of its new registration once it registers again', () => {
    // Inside a block that a field in proxy mode shows again, the field
    // renders anew: its old element is gone.
    const { fields, register } = createProvider()
    const first = document.createElement('div')
    const second = document.createElement('div')
    register(first)
    expect(fields.find(SLIDER, FIELD)?.element).toBe(first)

    register(second)
    expect(fields.find(SLIDER, FIELD)?.element).toBe(second)
  })

  it('keeps its last registration once it is no longer registered', () => {
    const { fields, register, unregister } = createProvider()
    const element = document.createElement('div')
    register(element)
    fields.find(SLIDER, FIELD)

    unregister()
    expect(fields.find(SLIDER, FIELD)?.element).toBe(element)
  })

  it('is none if it never registered', () => {
    const { fields } = createProvider()
    expect(fields.find(SLIDER, FIELD)).toBeUndefined()
  })
})
