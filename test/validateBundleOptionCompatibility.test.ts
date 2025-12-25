import { test, describe, expect } from 'vitest'
import {
  validateBundleOptionCompatibility,
  CollectedBlockFile,
} from '../src/Collector/Blocks'
import type { ExtractedBlockDefinitionInput } from '../src/module/types'

function createMockBlockFile(
  filePath: string,
  definition: ExtractedBlockDefinitionInput,
): CollectedBlockFile {
  const file = new CollectedBlockFile(filePath, '')
  // Directly set the definition for testing
  ;(file as any).definition = definition
  return file
}

describe('validateBundleOptionCompatibility', () => {
  test('returns no conflicts when options have same type across components', () => {
    const files = [
      createMockBlockFile('/path/to/Button.vue', {
        bundle: 'button',
        options: {
          color: {
            type: 'radios',
            label: 'Color',
            default: 'normal',
            options: { normal: 'Normal', primary: 'Primary' },
          },
        },
      }),
      createMockBlockFile('/path/to/ButtonNested.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
        options: {
          color: {
            type: 'radios',
            label: 'Color',
            default: 'normal',
            options: { normal: 'Normal', primary: 'Primary' },
          },
        },
      }),
    ]

    expect(validateBundleOptionCompatibility(files)).toEqual([])
  })

  test('returns conflict when same option has different types', () => {
    const files = [
      createMockBlockFile('/path/to/Button.vue', {
        bundle: 'button',
        options: {
          color: {
            type: 'radios',
            label: 'Color',
            default: 'normal',
            options: { normal: 'Normal', primary: 'Primary' },
          },
        },
      }),
      createMockBlockFile('/path/to/ButtonNested.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
        options: {
          color: {
            type: 'checkbox',
            label: 'Color',
            default: false,
          },
        },
      }),
    ]

    const conflicts = validateBundleOptionCompatibility(files)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].bundle).toBe('button')
    expect(conflicts[0].optionKey).toBe('color')
    expect(conflicts[0].reason).toBe('type')
    expect(conflicts[0].conflicts).toHaveLength(2)
    expect(conflicts[0].conflicts[0].type).toBe('radios')
    expect(conflicts[0].conflicts[1].type).toBe('checkbox')
  })

  test('returns conflict when radios have different option keys', () => {
    const files = [
      createMockBlockFile('/path/to/Button.vue', {
        bundle: 'button',
        options: {
          background: {
            type: 'radios',
            label: 'Background',
            default: 'light',
            options: { light: 'Light', dark: 'Dark' },
          },
        },
      }),
      createMockBlockFile('/path/to/ButtonNested.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
        options: {
          background: {
            type: 'radios',
            label: 'Background',
            default: 'red',
            options: { red: 'Red', blue: 'Blue' },
          },
        },
      }),
    ]

    const conflicts = validateBundleOptionCompatibility(files)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].bundle).toBe('button')
    expect(conflicts[0].optionKey).toBe('background')
    expect(conflicts[0].reason).toBe('options')
    expect(conflicts[0].conflicts).toHaveLength(2)
    expect(conflicts[0].conflicts[0].optionKeys).toEqual(['dark', 'light'])
    expect(conflicts[0].conflicts[1].optionKeys).toEqual(['blue', 'red'])
  })

  test('returns conflict when checkboxes have different option keys', () => {
    const files = [
      createMockBlockFile('/path/to/Button.vue', {
        bundle: 'button',
        options: {
          features: {
            type: 'checkboxes',
            label: 'Features',
            default: [],
            options: { bold: 'Bold', italic: 'Italic' },
          },
        },
      }),
      createMockBlockFile('/path/to/ButtonNested.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
        options: {
          features: {
            type: 'checkboxes',
            label: 'Features',
            default: [],
            options: { underline: 'Underline', strike: 'Strike' },
          },
        },
      }),
    ]

    const conflicts = validateBundleOptionCompatibility(files)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].reason).toBe('options')
  })

  test('returns no conflict when radios have same option keys', () => {
    const files = [
      createMockBlockFile('/path/to/Button.vue', {
        bundle: 'button',
        options: {
          background: {
            type: 'radios',
            label: 'Background',
            default: 'light',
            options: { light: 'Light', dark: 'Dark' },
          },
        },
      }),
      createMockBlockFile('/path/to/ButtonNested.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
        options: {
          background: {
            type: 'radios',
            label: 'Background',
            default: 'dark',
            options: { light: 'Helles', dark: 'Dunkles' }, // Same keys, different labels
          },
        },
      }),
    ]

    expect(validateBundleOptionCompatibility(files)).toEqual([])
  })

  test('returns no conflicts for different bundles with same option name', () => {
    const files = [
      createMockBlockFile('/path/to/Button.vue', {
        bundle: 'button',
        options: {
          color: {
            type: 'radios',
            label: 'Color',
            default: 'normal',
            options: { normal: 'Normal' },
          },
        },
      }),
      createMockBlockFile('/path/to/Card.vue', {
        bundle: 'card',
        options: {
          color: {
            type: 'checkbox',
            label: 'Color',
            default: false,
          },
        },
      }),
    ]

    expect(validateBundleOptionCompatibility(files)).toEqual([])
  })

  test('returns no conflicts for single component per bundle', () => {
    const files = [
      createMockBlockFile('/path/to/Button.vue', {
        bundle: 'button',
        options: {
          color: {
            type: 'radios',
            label: 'Color',
            default: 'normal',
            options: { normal: 'Normal' },
          },
        },
      }),
    ]

    expect(validateBundleOptionCompatibility(files)).toEqual([])
  })

  test('returns no conflicts when components have different options', () => {
    const files = [
      createMockBlockFile('/path/to/Button.vue', {
        bundle: 'button',
        options: {
          color: {
            type: 'radios',
            label: 'Color',
            default: 'normal',
            options: { normal: 'Normal' },
          },
        },
      }),
      createMockBlockFile('/path/to/ButtonNested.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
        options: {
          align: {
            type: 'radios',
            label: 'Align',
            default: 'left',
            options: { left: 'Left', right: 'Right' },
          },
        },
      }),
    ]

    expect(validateBundleOptionCompatibility(files)).toEqual([])
  })

  test('returns multiple conflicts for multiple conflicting options', () => {
    const files = [
      createMockBlockFile('/path/to/Button.vue', {
        bundle: 'button',
        options: {
          color: {
            type: 'radios',
            label: 'Color',
            default: 'normal',
            options: { normal: 'Normal' },
          },
          size: {
            type: 'radios',
            label: 'Size',
            default: 'medium',
            options: { small: 'Small', medium: 'Medium' },
          },
        },
      }),
      createMockBlockFile('/path/to/ButtonNested.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
        options: {
          color: {
            type: 'checkbox',
            label: 'Color',
            default: false,
          },
          size: {
            type: 'number',
            label: 'Size',
            default: 10,
            min: 0,
            max: 100,
          },
        },
      }),
    ]

    const conflicts = validateBundleOptionCompatibility(files)
    expect(conflicts).toHaveLength(2)
  })

  test('handles components without options', () => {
    const files = [
      createMockBlockFile('/path/to/Button.vue', {
        bundle: 'button',
        options: {
          color: {
            type: 'radios',
            label: 'Color',
            default: 'normal',
            options: { normal: 'Normal' },
          },
        },
      }),
      createMockBlockFile('/path/to/ButtonNested.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
    ]

    expect(validateBundleOptionCompatibility(files)).toEqual([])
  })

  test('handles empty files array', () => {
    expect(validateBundleOptionCompatibility([])).toEqual([])
  })

  test('detects conflict across three or more components', () => {
    const files = [
      createMockBlockFile('/path/to/Button.vue', {
        bundle: 'button',
        options: {
          color: {
            type: 'radios',
            label: 'Color',
            default: 'normal',
            options: { normal: 'Normal' },
          },
        },
      }),
      createMockBlockFile('/path/to/ButtonNested.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
        options: {
          color: {
            type: 'checkbox',
            label: 'Color',
            default: false,
          },
        },
      }),
      createMockBlockFile('/path/to/ButtonInline.vue', {
        bundle: 'button',
        renderFor: [{ fieldList: 'inline' }],
        options: {
          color: {
            type: 'text',
            label: 'Color',
            default: '',
          },
        },
      }),
    ]

    const conflicts = validateBundleOptionCompatibility(files)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].conflicts).toHaveLength(3)
  })
})
