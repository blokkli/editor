// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { AnalyzerContext } from './Context'
import type { TextFieldValue } from '#blokkli/editor/providers/fieldValue'

const ENTITY = { type: 'node', uuid: 'host-uuid', bundle: 'page' }

function createContext(options: {
  textFieldValues?: TextFieldValue[]
  fieldType?: 'plain' | 'markup' | null
}) {
  const getTextFieldValues = vi.fn(() => options.textFieldValues ?? [])
  const resolveFieldType = vi.fn(() => options.fieldType ?? null)
  const readRawValue = vi.fn(() => 'RAW')
  const readValue = vi.fn(() => 'RENDERED')

  const state = {
    mutatedFields: { value: [] },
    violations: { value: [] },
    getFieldListItem: () => undefined,
  }

  const context = new AnalyzerContext(
    'de',
    'de',
    document.createElement('div'),
    state as never,
    ((_key: string, defaultValue?: string) => defaultValue || '') as never,
    undefined,
    {} as never,
    ENTITY,
    { getTextFieldValues, resolveFieldType, readRawValue, readValue } as never,
  )

  return {
    context,
    getTextFieldValues,
    resolveFieldType,
    readRawValue,
    readValue,
  }
}

describe('AnalyzerContext', () => {
  it('exposes the host entity', () => {
    const { context } = createContext({})
    expect(context.entity).toEqual(ENTITY)
  })

  it('returns the text field values from the field value provider', () => {
    const values: TextFieldValue[] = [
      {
        uuid: 'host-uuid',
        fieldName: 'field_body',
        value: '<p><a href="/relative">Link</a></p>',
        fieldType: 'markup',
        entityType: 'node',
        entityBundle: 'page',
      },
    ]
    const { context } = createContext({ textFieldValues: values })
    expect(context.getTextFieldValues()).toEqual(values)
  })

  it('reads the text field values once per context', () => {
    const { context, getTextFieldValues } = createContext({})
    context.getTextFieldValues()
    context.getTextFieldValues()
    expect(getTextFieldValues).toHaveBeenCalledTimes(1)
  })

  it('returns the processed values for the same fields when asked', () => {
    const values: TextFieldValue[] = [
      {
        uuid: 'block-1',
        fieldName: 'field_text',
        value: '<p>RAW</p>',
        fieldType: 'markup',
        entityType: 'paragraph',
        entityBundle: 'text',
      },
    ]
    const { context, readValue } = createContext({ textFieldValues: values })
    const processed = context.getTextFieldValues({ processed: true })
    expect(processed).toEqual([{ ...values[0], value: 'RENDERED' }])
    expect(readValue).toHaveBeenCalledWith(
      'paragraph',
      'block-1',
      'text',
      'field_text',
      'markup',
    )
    // The raw snapshot stays untouched.
    expect(context.getTextFieldValues()).toEqual(values)
    context.getTextFieldValues({ processed: true })
    expect(readValue).toHaveBeenCalledTimes(1)
  })

  it('reads a raw value with the resolved field type', () => {
    const { context, readRawValue } = createContext({ fieldType: 'markup' })
    const host = { type: 'paragraph', uuid: 'block-1', bundle: 'text' }
    expect(context.readRawValue(host, 'field_text')).toBe('RAW')
    expect(readRawValue).toHaveBeenCalledWith(
      'paragraph',
      'block-1',
      'text',
      'field_text',
      'markup',
    )
  })

  it('returns null for a field that is not an editable text field', () => {
    const { context, readRawValue } = createContext({ fieldType: null })
    const host = { type: 'paragraph', uuid: 'block-1', bundle: 'image' }
    expect(context.readRawValue(host, 'field_image')).toBeNull()
    expect(readRawValue).not.toHaveBeenCalled()
  })
})
