import { describe, expect, test } from 'vitest'
import type { PluginConfigInput } from '#blokkli/editor/types/pluginConfig'
import { isInputRequired, isInputVisible } from './index'

function buildInput(input: Partial<PluginConfigInput> = {}): PluginConfigInput {
  return {
    type: 'text',
    name: 'licence',
    label: 'Licence',
    required: false,
    ...input,
  } as PluginConfigInput
}

describe('isInputVisible', () => {
  test('an input without a condition is shown', () => {
    expect(isInputVisible(buildInput(), {})).toBe(true)
  })

  test('an input is shown while a checkbox is checked, or not', () => {
    const checked = buildInput({ visibleIf: { name: 'licensed', value: true } })
    expect(isInputVisible(checked, {})).toBe(false)
    expect(isInputVisible(checked, { licensed: false })).toBe(false)
    expect(isInputVisible(checked, { licensed: true })).toBe(true)

    const unchecked = buildInput({
      visibleIf: { name: 'licensed', value: false },
    })
    expect(isInputVisible(unchecked, {})).toBe(true)
    expect(isInputVisible(unchecked, { licensed: true })).toBe(false)
  })

  test('an input is shown while another has a value', () => {
    const input = buildInput({ visibleIf: { name: 'kind', value: 'drawing' } })
    expect(isInputVisible(input, { kind: 'photo' })).toBe(false)
    expect(isInputVisible(input, { kind: 'drawing' })).toBe(true)
  })
})

describe('isInputRequired', () => {
  test('a required input is required while it is shown', () => {
    const input = buildInput({
      required: true,
      visibleIf: { name: 'licensed', value: true },
    })
    expect(isInputRequired(input, { licensed: true })).toBe(true)
    expect(isInputRequired(input, { licensed: false })).toBe(false)
  })

  test('an input is required while its condition holds', () => {
    const input = buildInput({ requiredIf: { name: 'licensed', value: true } })
    expect(isInputRequired(input, {})).toBe(false)
    expect(isInputRequired(input, { licensed: true })).toBe(true)
  })
})
