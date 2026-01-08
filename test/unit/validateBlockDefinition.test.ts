import { test, describe, expect } from 'vitest'
import {
  validateBlockDefinition,
  CollectedBlockFile,
} from '../../src/build/Collector/Blocks'
import type { BlockDefinitionInputBase } from '../../src/global/types/definitions'

function createMockBlockFile(
  definition: BlockDefinitionInputBase,
  options: { type?: 'main' | 'context'; iconPath?: string | null } = {},
): CollectedBlockFile {
  const file = new CollectedBlockFile('/path/to/Block.vue', '')
  ;(file as any).definition = definition
  ;(file as any).type = options.type ?? 'main'
  ;(file as any).iconPath = options.iconPath ?? null
  return file
}

describe('validateBlockDefinition', () => {
  describe('radios option', () => {
    test('returns no errors when default matches an option', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          alignment: {
            type: 'radios',
            label: 'Alignment',
            default: 'left',
            options: {
              left: 'Left',
              center: 'Center',
              right: 'Right',
            },
          },
        },
      }
      expect(validateBlockDefinition(definition)).toEqual([])
    })

    test('returns error when default does not match any option', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          alignment: {
            type: 'radios',
            label: 'Alignment',
            default: 'invalid',
            options: {
              left: 'Left',
              center: 'Center',
              right: 'Right',
            },
          },
        },
      }
      const errors = validateBlockDefinition(definition)
      expect(errors).toHaveLength(1)
      expect(errors[0].optionKey).toBe('alignment')
      expect(errors[0].message).toContain('invalid')
      expect(errors[0].message).toContain('left')
    })
  })

  describe('checkboxes option', () => {
    test('returns no errors when all defaults match options', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          features: {
            type: 'checkboxes',
            label: 'Features',
            default: ['one', 'two'],
            options: {
              one: 'One',
              two: 'Two',
              three: 'Three',
            },
          },
        },
      }
      expect(validateBlockDefinition(definition)).toEqual([])
    })

    test('returns error when a default value does not match any option', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          features: {
            type: 'checkboxes',
            label: 'Features',
            default: ['one', 'invalid'],
            options: {
              one: 'One',
              two: 'Two',
            },
          },
        },
      }
      const errors = validateBlockDefinition(definition)
      expect(errors).toHaveLength(1)
      expect(errors[0].optionKey).toBe('features')
      expect(errors[0].message).toContain('invalid')
    })

    test('returns multiple errors for multiple invalid defaults', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          features: {
            type: 'checkboxes',
            label: 'Features',
            default: ['invalid1', 'invalid2'],
            options: {
              one: 'One',
            },
          },
        },
      }
      const errors = validateBlockDefinition(definition)
      expect(errors).toHaveLength(2)
    })
  })

  describe('number option', () => {
    test('returns no errors when default is within range', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          count: {
            type: 'number',
            label: 'Count',
            default: 5,
            min: 0,
            max: 10,
          },
        },
      }
      expect(validateBlockDefinition(definition)).toEqual([])
    })

    test('returns error when default is less than min', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          count: {
            type: 'number',
            label: 'Count',
            default: -5,
            min: 0,
            max: 10,
          },
        },
      }
      const errors = validateBlockDefinition(definition)
      expect(errors).toHaveLength(1)
      expect(errors[0].optionKey).toBe('count')
      expect(errors[0].message).toContain('less than the minimum')
    })

    test('returns error when default is greater than max', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          count: {
            type: 'number',
            label: 'Count',
            default: 15,
            min: 0,
            max: 10,
          },
        },
      }
      const errors = validateBlockDefinition(definition)
      expect(errors).toHaveLength(1)
      expect(errors[0].optionKey).toBe('count')
      expect(errors[0].message).toContain('greater than the maximum')
    })
  })

  describe('range option', () => {
    test('returns no errors when default is within range', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          opacity: {
            type: 'range',
            label: 'Opacity',
            default: 50,
            min: 0,
            max: 100,
            step: 10,
          },
        },
      }
      expect(validateBlockDefinition(definition)).toEqual([])
    })

    test('returns error when default is out of range', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          opacity: {
            type: 'range',
            label: 'Opacity',
            default: 150,
            min: 0,
            max: 100,
            step: 10,
          },
        },
      }
      const errors = validateBlockDefinition(definition)
      expect(errors).toHaveLength(1)
      expect(errors[0].optionKey).toBe('opacity')
    })
  })

  describe('color option', () => {
    test('returns no errors for valid hex color', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          bgColor: {
            type: 'color',
            label: 'Background Color',
            default: '#ff0000',
          },
        },
      }
      expect(validateBlockDefinition(definition)).toEqual([])
    })

    test('returns no errors for uppercase hex color', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          bgColor: {
            type: 'color',
            label: 'Background Color',
            default: '#FF00AA',
          },
        },
      }
      expect(validateBlockDefinition(definition)).toEqual([])
    })

    test('returns error for invalid hex color format', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          bgColor: {
            type: 'color',
            label: 'Background Color',
            default: '#fff' as `#${string}`,
          },
        },
      }
      const errors = validateBlockDefinition(definition)
      expect(errors).toHaveLength(1)
      expect(errors[0].optionKey).toBe('bgColor')
      expect(errors[0].message).toContain('not a valid hex color')
    })

    test('returns error for hex color without hash', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          bgColor: {
            type: 'color',
            label: 'Background Color',
            default: 'ff0000' as `#${string}`,
          },
        },
      }
      const errors = validateBlockDefinition(definition)
      expect(errors).toHaveLength(1)
      expect(errors[0].optionKey).toBe('bgColor')
    })
  })

  describe('datetime-local option', () => {
    test('returns no errors for valid datetime', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          publishDate: {
            type: 'datetime-local',
            label: 'Publish Date',
            default: '2024-03-15T14:30:00',
          },
        },
      }
      expect(validateBlockDefinition(definition)).toEqual([])
    })

    test('returns no errors when datetime is within min/max range', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          publishDate: {
            type: 'datetime-local',
            label: 'Publish Date',
            default: '2024-06-15T14:30:00',
            min: '2024-01-01T00:00:00',
            max: '2024-12-31T23:59:59',
          },
        },
      }
      expect(validateBlockDefinition(definition)).toEqual([])
    })

    test('returns error for invalid datetime format', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          publishDate: {
            type: 'datetime-local',
            label: 'Publish Date',
            default: 'not-a-date',
          },
        },
      }
      const errors = validateBlockDefinition(definition)
      expect(errors).toHaveLength(1)
      expect(errors[0].optionKey).toBe('publishDate')
      expect(errors[0].message).toContain('not a valid datetime')
    })

    test('returns error when datetime is before min', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          publishDate: {
            type: 'datetime-local',
            label: 'Publish Date',
            default: '2023-06-15T14:30:00',
            min: '2024-01-01T00:00:00',
          },
        },
      }
      const errors = validateBlockDefinition(definition)
      expect(errors).toHaveLength(1)
      expect(errors[0].optionKey).toBe('publishDate')
      expect(errors[0].message).toContain('before the minimum')
    })

    test('returns error when datetime is after max', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          publishDate: {
            type: 'datetime-local',
            label: 'Publish Date',
            default: '2025-06-15T14:30:00',
            max: '2024-12-31T23:59:59',
          },
        },
      }
      const errors = validateBlockDefinition(definition)
      expect(errors).toHaveLength(1)
      expect(errors[0].optionKey).toBe('publishDate')
      expect(errors[0].message).toContain('after the maximum')
    })
  })

  describe('multiple options', () => {
    test('validates all options and returns all errors', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        options: {
          alignment: {
            type: 'radios',
            label: 'Alignment',
            default: 'invalid',
            options: {
              left: 'Left',
            },
          },
          count: {
            type: 'number',
            label: 'Count',
            default: 100,
            min: 0,
            max: 10,
          },
        },
      }
      const errors = validateBlockDefinition(definition)
      expect(errors).toHaveLength(2)
    })
  })

  describe('no options', () => {
    test('returns no errors for definition without options', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
      }
      expect(validateBlockDefinition(definition)).toEqual([])
    })
  })

  describe('deprecated fieldList in renderFor', () => {
    test('returns warning when using fieldList in renderFor', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        renderFor: [{ fieldList: 'inline' }],
      }
      const errors = validateBlockDefinition(definition)
      expect(errors).toHaveLength(1)
      expect(errors[0].severity).toBe('warning')
      expect(errors[0].message).toContain('deprecated')
      expect(errors[0].message).toContain('fieldList')
    })

    test('returns no warning when using fieldListType in renderFor', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        renderFor: [{ fieldListType: 'inline' }],
      }
      expect(validateBlockDefinition(definition)).toEqual([])
    })

    test('returns no warning when using parentBundle in renderFor', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        renderFor: [{ parentBundle: 'grid' }],
      }
      expect(validateBlockDefinition(definition)).toEqual([])
    })

    test('returns warning for each fieldList entry', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        renderFor: [
          { fieldList: 'inline' },
          { fieldList: 'sidebar' },
          { parentBundle: 'grid' },
        ],
      }
      const errors = validateBlockDefinition(definition)
      const warnings = errors.filter((e) => e.severity === 'warning')
      expect(warnings).toHaveLength(2)
    })

    test('returns both error and warning when combined with option error', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        renderFor: [{ fieldList: 'inline' }],
        options: {
          color: {
            type: 'radios',
            label: 'Color',
            default: 'invalid',
            options: { red: 'Red' },
          },
        },
      }
      const errors = validateBlockDefinition(definition)
      expect(errors).toHaveLength(2)
      const warnings = errors.filter((e) => e.severity === 'warning')
      const actualErrors = errors.filter((e) => e.severity !== 'warning')
      expect(warnings).toHaveLength(1)
      expect(actualErrors).toHaveLength(1)
    })
  })
})

function createMockBlockFileWithContents(
  definition: BlockDefinitionInputBase,
  fileContents: string,
  options: { type?: 'main' | 'context'; iconPath?: string | null } = {},
): CollectedBlockFile {
  const file = new CollectedBlockFile('/path/to/Block.vue', fileContents)
  ;(file as any).definition = definition
  ;(file as any).type = options.type ?? 'main'
  ;(file as any).iconPath = options.iconPath ?? null
  return file
}

describe('CollectedBlockFile.validate', () => {
  describe('missing icon warning', () => {
    test('returns warning when main block has no icon file and no editor.icon', () => {
      const file = createMockBlockFile({
        bundle: 'test',
      })
      const errors = file.validate()
      const warnings = errors.filter((e) => e.severity === 'warning')
      expect(warnings).toHaveLength(1)
      expect(warnings[0].message).toContain('missing an icon')
    })

    test('returns no warning when main block has icon file', () => {
      const file = createMockBlockFile(
        { bundle: 'test' },
        { iconPath: '/path/to/icon.svg' },
      )
      const errors = file.validate()
      const warnings = errors.filter((e) => e.severity === 'warning')
      expect(warnings).toHaveLength(0)
    })

    test('returns no warning when main block has editor.icon', () => {
      const file = createMockBlockFile({
        bundle: 'test',
        editor: {
          icon: 'some_icon',
        },
      })
      const errors = file.validate()
      const warnings = errors.filter((e) => e.severity === 'warning')
      expect(warnings).toHaveLength(0)
    })

    test('returns no warning for context blocks without icon', () => {
      const file = createMockBlockFile(
        {
          bundle: 'test',
          renderFor: [{ parentBundle: 'grid' }],
        },
        { type: 'context' },
      )
      const errors = file.validate()
      const warnings = errors.filter(
        (e) => e.severity === 'warning' && e.message.includes('icon'),
      )
      expect(warnings).toHaveLength(0)
    })

    test('caches validation results', () => {
      const file = createMockBlockFile({ bundle: 'test' })
      const firstResult = file.validate()
      const secondResult = file.validate()
      expect(firstResult).toBe(secondResult)
    })
  })

  describe('deprecated isEditing warning', () => {
    test('returns warning when isEditing is destructured from defineBlokkli', () => {
      const fileContents = `
const { isEditing } = defineBlokkli({
  bundle: 'test',
})
`
      const file = createMockBlockFileWithContents(
        { bundle: 'test', editor: { icon: 'test' } },
        fileContents,
      )
      const errors = file.validate()
      const warnings = errors.filter(
        (e) => e.severity === 'warning' && e.message.includes('isEditing'),
      )
      expect(warnings).toHaveLength(1)
      expect(warnings[0].message).toContain('deprecated')
      expect(warnings[0].message).toContain('import.meta.blokkliEditing')
    })

    test('returns warning when isEditing is destructured with other properties', () => {
      const fileContents = `
const { options, isEditing, index } = defineBlokkli({
  bundle: 'test',
})
`
      const file = createMockBlockFileWithContents(
        { bundle: 'test', editor: { icon: 'test' } },
        fileContents,
      )
      const errors = file.validate()
      const warnings = errors.filter(
        (e) => e.severity === 'warning' && e.message.includes('isEditing'),
      )
      expect(warnings).toHaveLength(1)
    })

    test('returns warning when isEditing is destructured from defineBlokkliFragment', () => {
      const fileContents = `
const { isEditing } = defineBlokkliFragment({
  name: 'test',
})
`
      const file = createMockBlockFileWithContents(
        { bundle: 'test', editor: { icon: 'test' } },
        fileContents,
      )
      const errors = file.validate()
      const warnings = errors.filter(
        (e) => e.severity === 'warning' && e.message.includes('isEditing'),
      )
      expect(warnings).toHaveLength(1)
    })

    test('returns no warning when isEditing is not used', () => {
      const fileContents = `
const { options } = defineBlokkli({
  bundle: 'test',
})
`
      const file = createMockBlockFileWithContents(
        { bundle: 'test', editor: { icon: 'test' } },
        fileContents,
      )
      const errors = file.validate()
      const warnings = errors.filter(
        (e) => e.severity === 'warning' && e.message.includes('isEditing'),
      )
      expect(warnings).toHaveLength(0)
    })

    test('returns no warning when isEditing is used in unrelated context', () => {
      const fileContents = `
const isEditing = ref(false)
const { options } = defineBlokkli({
  bundle: 'test',
})
`
      const file = createMockBlockFileWithContents(
        { bundle: 'test', editor: { icon: 'test' } },
        fileContents,
      )
      const errors = file.validate()
      const warnings = errors.filter(
        (e) => e.severity === 'warning' && e.message.includes('isEditing'),
      )
      expect(warnings).toHaveLength(0)
    })

    test('returns warning with multiline destructuring', () => {
      const fileContents = `
const {
  options,
  isEditing,
  index,
} = defineBlokkli({
  bundle: 'test',
})
`
      const file = createMockBlockFileWithContents(
        { bundle: 'test', editor: { icon: 'test' } },
        fileContents,
      )
      const errors = file.validate()
      const warnings = errors.filter(
        (e) => e.severity === 'warning' && e.message.includes('isEditing'),
      )
      expect(warnings).toHaveLength(1)
    })
  })
})
