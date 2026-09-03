// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { AnalyzerContext } from './Context'
import type { TextFieldValue } from '#blokkli/editor/providers/fieldValue'

const ENTITY = { type: 'node', uuid: 'host-uuid', bundle: 'page' }

function createContext(options: {
  textFieldValues?: TextFieldValue[]
  fieldType?: 'plain' | 'markup' | null
  root?: HTMLElement
  mutatedFields?: unknown[]
  registeredBlocks?: Record<string, HTMLElement>
}) {
  const getTextFieldValues = vi.fn(() => options.textFieldValues ?? [])
  const resolveFieldType = vi.fn(() => options.fieldType ?? null)
  const readRawValue = vi.fn(() => 'RAW')
  const readValue = vi.fn(() => 'RENDERED')

  const state = {
    mutatedFields: { value: options.mutatedFields ?? [] },
    violations: { value: [] },
    getFieldListItem: () => undefined,
    getAllUuids: vi.fn(() => ['a', 'b']),
  }
  const dom = { registeredBlocks: { value: options.registeredBlocks ?? {} } }

  const context = new AnalyzerContext(
    'de',
    'de',
    options.root ?? document.createElement('div'),
    state as never,
    ((_key: string, defaultValue?: string) => defaultValue || '') as never,
    undefined,
    {} as never,
    ENTITY,
    { getTextFieldValues, resolveFieldType, readRawValue, readValue } as never,
    dom as never,
    {} as never,
    {} as never,
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

  it('detects elements that opted out of analysis', () => {
    const root = document.createElement('div')
    root.innerHTML =
      '<p id="kept">a</p><div class="bk-skip-analyze"><p id="skipped">b</p></div>'
    const { context } = createContext({ root })
    expect(context.isSkipped(root.querySelector('#kept')!)).toBe(false)
    expect(context.isSkipped(root.querySelector('#skipped')!)).toBe(true)
    expect(context.querySelectorAll('p').map((el) => el.id)).toEqual(['kept'])
  })

  it('resolves block elements and owning block uuids', () => {
    const root = document.createElement('div')
    root.innerHTML =
      '<a id="host"></a><div data-bk-uuid="outer"><a id="outer-link"></a><div data-bk-uuid="inner"><a id="inner-link"></a></div></div>'
    const outer = root.querySelector<HTMLElement>('[data-bk-uuid="outer"]')!
    const { context } = createContext({
      root,
      registeredBlocks: { outer },
    })
    expect(context.getBlockElement('outer')).toBe(outer)
    expect(context.getBlockElement('missing')).toBeUndefined()
    expect(context.getBlockUuid(root.querySelector('#host')!)).toBeUndefined()
    expect(context.getBlockUuid(root.querySelector('#outer-link')!)).toBe(
      'outer',
    )
    expect(context.getBlockUuid(root.querySelector('#inner-link')!)).toBe(
      'inner',
    )
  })

  it('returns the direct children of an entity', () => {
    const child = { uuid: 'child', bundle: 'text' }
    const grandchild = { uuid: 'grandchild', bundle: 'text' }
    const { context } = createContext({
      mutatedFields: [
        { name: 'field_blocks', entityUuid: 'host-uuid', list: [child] },
        { name: 'field_nested', entityUuid: 'child', list: [grandchild] },
      ],
    })
    expect(context.getChildBlocks('host-uuid')).toEqual([child])
    expect(context.getChildBlocks('child', 'field_nested')).toEqual([
      grandchild,
    ])
    expect(context.getChildBlocks('child', 'field_other')).toEqual([])
    expect(context.getAllUuids('text')).toEqual(['a', 'b'])
  })
})
