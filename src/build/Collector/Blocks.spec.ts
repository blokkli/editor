import { test, describe, expect, vi } from 'vitest'
import {
  validateBlockDefinition,
  validateMissingMainComponent,
  validateBundleOptionCompatibility,
  validateRenderForConflicts,
  BlockCollector,
  CollectedBlockFile,
} from './Blocks'
import type {
  BlockDefinitionInputBase,
  FragmentDefinitionInputBase,
} from '../../global/types/definitions'
import type { BlockHydration } from '../../global/constants'
import type { ModuleHelper } from '../ModuleHelper'
import type { IconCollector } from './Icons'

const mockIcons = {} as IconCollector

// ============================================================================
// Helpers
// ============================================================================

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

function createMockBlockFileWithPath(
  filePath: string,
  definition: BlockDefinitionInputBase,
  type: 'main' | 'context' = 'main',
): CollectedBlockFile {
  const file = new CollectedBlockFile(filePath, '')
  ;(file as any).definition = definition
  ;(file as any).type = type
  return file
}

function createMockBlockFileForRenderFor(
  filePath: string,
  definition: BlockDefinitionInputBase,
): CollectedBlockFile {
  const file = new CollectedBlockFile(filePath, '')
  ;(file as any).definition = definition

  const bundle = definition.bundle
  if (!definition.renderFor) {
    ;(file as any).variations = ['block:' + bundle]
  } else {
    const renderFor = Array.isArray(definition.renderFor)
      ? definition.renderFor
      : [definition.renderFor]
    ;(file as any).variations = renderFor
      .map((v) => {
        if ('parentBundle' in v) {
          return `block:${bundle}__p:${v.parentBundle}`
        } else if ('fieldList' in v) {
          return `block:${bundle}__f:${v.fieldList}`
        } else if ('fieldListType' in v) {
          return `block:${bundle}__f:${v.fieldListType}`
        } else {
          return `block:${bundle}__f:unknown`
        }
      })
      .sort()
  }

  return file
}

// ============================================================================
// validateBlockDefinition
// ============================================================================

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
      expect(validateBlockDefinition(definition, mockIcons)).toEqual([])
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
      const errors = validateBlockDefinition(definition, mockIcons)
      expect(errors).toHaveLength(1)
      expect(errors[0]!.optionKey).toBe('alignment')
      expect(errors[0]!.message).toContain('invalid')
      expect(errors[0]!.message).toContain('left')
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
      expect(validateBlockDefinition(definition, mockIcons)).toEqual([])
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
      const errors = validateBlockDefinition(definition, mockIcons)
      expect(errors).toHaveLength(1)
      expect(errors[0]!.optionKey).toBe('features')
      expect(errors[0]!.message).toContain('invalid')
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
      const errors = validateBlockDefinition(definition, mockIcons)
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
      expect(validateBlockDefinition(definition, mockIcons)).toEqual([])
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
      const errors = validateBlockDefinition(definition, mockIcons)
      expect(errors).toHaveLength(1)
      expect(errors[0]!.optionKey).toBe('count')
      expect(errors[0]!.message).toContain('less than the minimum')
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
      const errors = validateBlockDefinition(definition, mockIcons)
      expect(errors).toHaveLength(1)
      expect(errors[0]!.optionKey).toBe('count')
      expect(errors[0]!.message).toContain('greater than the maximum')
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
      expect(validateBlockDefinition(definition, mockIcons)).toEqual([])
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
      const errors = validateBlockDefinition(definition, mockIcons)
      expect(errors).toHaveLength(1)
      expect(errors[0]!.optionKey).toBe('opacity')
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
      expect(validateBlockDefinition(definition, mockIcons)).toEqual([])
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
      expect(validateBlockDefinition(definition, mockIcons)).toEqual([])
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
      const errors = validateBlockDefinition(definition, mockIcons)
      expect(errors).toHaveLength(1)
      expect(errors[0]!.optionKey).toBe('bgColor')
      expect(errors[0]!.message).toContain('not a valid hex color')
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
      const errors = validateBlockDefinition(definition, mockIcons)
      expect(errors).toHaveLength(1)
      expect(errors[0]!.optionKey).toBe('bgColor')
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
      expect(validateBlockDefinition(definition, mockIcons)).toEqual([])
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
      expect(validateBlockDefinition(definition, mockIcons)).toEqual([])
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
      const errors = validateBlockDefinition(definition, mockIcons)
      expect(errors).toHaveLength(1)
      expect(errors[0]!.optionKey).toBe('publishDate')
      expect(errors[0]!.message).toContain('not a valid datetime')
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
      const errors = validateBlockDefinition(definition, mockIcons)
      expect(errors).toHaveLength(1)
      expect(errors[0]!.optionKey).toBe('publishDate')
      expect(errors[0]!.message).toContain('before the minimum')
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
      const errors = validateBlockDefinition(definition, mockIcons)
      expect(errors).toHaveLength(1)
      expect(errors[0]!.optionKey).toBe('publishDate')
      expect(errors[0]!.message).toContain('after the maximum')
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
      const errors = validateBlockDefinition(definition, mockIcons)
      expect(errors).toHaveLength(2)
    })
  })

  describe('no options', () => {
    test('returns no errors for definition without options', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
      }
      expect(validateBlockDefinition(definition, mockIcons)).toEqual([])
    })
  })

  describe('deprecated fieldList in renderFor', () => {
    test('returns warning when using fieldList in renderFor', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        renderFor: [{ fieldList: 'inline' }],
      }
      const errors = validateBlockDefinition(definition, mockIcons)
      expect(errors).toHaveLength(1)
      expect(errors[0]!.severity).toBe('warning')
      expect(errors[0]!.message).toContain('deprecated')
      expect(errors[0]!.message).toContain('fieldList')
    })

    test('returns no warning when using fieldListType in renderFor', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        renderFor: [{ fieldListType: 'inline' }],
      }
      expect(validateBlockDefinition(definition, mockIcons)).toEqual([])
    })

    test('returns no warning when using parentBundle in renderFor', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        renderFor: [{ parentBundle: 'grid' }],
      }
      expect(validateBlockDefinition(definition, mockIcons)).toEqual([])
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
      const errors = validateBlockDefinition(definition, mockIcons)
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
      const errors = validateBlockDefinition(definition, mockIcons)
      expect(errors).toHaveLength(2)
      const warnings = errors.filter((e) => e.severity === 'warning')
      const actualErrors = errors.filter((e) => e.severity !== 'warning')
      expect(warnings).toHaveLength(1)
      expect(actualErrors).toHaveLength(1)
    })
  })

  describe('hydrate', () => {
    test.each<BlockHydration>(['never', 'visible', 'idle'])(
      'returns no errors for "%s"',
      (hydrate) => {
        expect(
          validateBlockDefinition({ bundle: 'test', hydrate }, mockIcons),
        ).toEqual([])
        expect(
          validateBlockDefinition(
            { name: 'test', label: 'Test', hydrate },
            mockIcons,
          ),
        ).toEqual([])
      },
    )

    test.each<unknown>(['interaction', 'lazy', true, {}])(
      'returns an error for %j',
      (hydrate) => {
        const errors = validateBlockDefinition(
          { bundle: 'test', hydrate: hydrate as BlockHydration },
          mockIcons,
        )
        expect(errors).toHaveLength(1)
        expect(errors[0]!.severity).toBe('error')
        expect(errors[0]!.message).toContain('Invalid "hydrate" value')
      },
    )

    test('refuses an unknown value in its type', () => {
      const definition: BlockDefinitionInputBase = {
        bundle: 'test',
        // @ts-expect-error Not one of the values.
        hydrate: 'interaction',
      }
      expect(validateBlockDefinition(definition, mockIcons)).toHaveLength(1)
    })

    test('returns an error together with chunkName', () => {
      const block: BlockDefinitionInputBase = {
        bundle: 'test',
        hydrate: 'never',
        chunkName: 'rare',
      }
      const fragment: FragmentDefinitionInputBase = {
        name: 'test',
        label: 'Test',
        hydrate: 'visible',
        chunkName: 'rare',
      }

      for (const definition of [block, fragment]) {
        const errors = validateBlockDefinition(definition, mockIcons)
        expect(errors).toHaveLength(1)
        expect(errors[0]!.severity).toBe('error')
        expect(errors[0]!.message).toContain('Remove chunkName: "rare"')
      }
    })

    test('ignores it on a provider', () => {
      const provider = {
        entityType: 'node',
        bundle: 'page',
        hydrate: 'lazy',
      } as unknown as BlockDefinitionInputBase
      expect(validateBlockDefinition(provider, mockIcons)).toEqual([])
    })
  })
})

// ============================================================================
// CollectedBlockFile.validate
// ============================================================================

describe('CollectedBlockFile.validate', () => {
  describe('missing icon warning', () => {
    test('returns warning when main block has no icon file and no editor.icon', () => {
      const file = createMockBlockFile({
        bundle: 'test',
      })
      const errors = file.validate(mockIcons)
      const warnings = errors.filter((e) => e.severity === 'warning')
      expect(warnings).toHaveLength(1)
      expect(warnings[0]!.message).toContain('missing an icon')
    })

    test('returns no warning when main block has icon file', () => {
      const file = createMockBlockFile(
        { bundle: 'test' },
        { iconPath: '/path/to/icon.svg' },
      )
      const errors = file.validate(mockIcons)
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
      const errors = file.validate(mockIcons)
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
      const errors = file.validate(mockIcons)
      const warnings = errors.filter(
        (e) => e.severity === 'warning' && e.message.includes('icon'),
      )
      expect(warnings).toHaveLength(0)
    })

    test('caches validation results', () => {
      const file = createMockBlockFile({ bundle: 'test' })
      const firstResult = file.validate(mockIcons)
      const secondResult = file.validate(mockIcons)
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
      const errors = file.validate(mockIcons)
      const warnings = errors.filter(
        (e) => e.severity === 'warning' && e.message.includes('isEditing'),
      )
      expect(warnings).toHaveLength(1)
      expect(warnings[0]!.message).toContain('deprecated')
      expect(warnings[0]!.message).toContain('import.meta.blokkliEditing')
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
      const errors = file.validate(mockIcons)
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
      const errors = file.validate(mockIcons)
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
      const errors = file.validate(mockIcons)
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
      const errors = file.validate(mockIcons)
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
      const errors = file.validate(mockIcons)
      const warnings = errors.filter(
        (e) => e.severity === 'warning' && e.message.includes('isEditing'),
      )
      expect(warnings).toHaveLength(1)
    })
  })
})

// ============================================================================
// CollectedBlockFile.hydrate
// ============================================================================

describe('CollectedBlockFile.hydrate', () => {
  const helper = {
    fileCache: {
      fileExists: () => false,
      read: () => Promise.resolve(''),
    },
    getMappedBlockBundle: (bundle: string) => bundle,
  } as unknown as ModuleHelper

  async function collect(script: string): Promise<CollectedBlockFile> {
    const file = new CollectedBlockFile(
      '/path/to/Block.vue',
      `<template><div /></template>\n<script lang="ts" setup>\n${script}\n</script>`,
    )
    await file.handleChange(helper)
    return file
  }

  test('is the value of a block', async () => {
    const file = await collect(
      `defineBlokkli({ bundle: 'text', hydrate: 'never' })`,
    )
    expect(file.hydrate).toBe('never')
    expect(file.chunkName).toBe('global')
  })

  test('is the value of a fragment', async () => {
    const file = await collect(
      `defineBlokkliFragment({ name: 'test', label: 'Test', hydrate: 'idle' })`,
    )
    expect(file.hydrate).toBe('idle')
  })

  test('is null without it', async () => {
    const file = await collect(`defineBlokkli({ bundle: 'text' })`)
    expect(file.hydrate).toBeNull()
  })

  test('is null for an unknown value', async () => {
    const file = await collect(
      `defineBlokkli({ bundle: 'text', hydrate: 'interaction' })`,
    )
    expect(file.hydrate).toBeNull()
  })

  test('is null with a chunkName, which keeps its group', async () => {
    const file = await collect(
      `defineBlokkli({ bundle: 'text', hydrate: 'never', chunkName: 'rare' })`,
    )
    expect(file.hydrate).toBeNull()
    expect(file.chunkName).toBe('rare')
  })

  test('is null for a provider', async () => {
    const file = await collect(
      `defineBlokkliProvider({ entityType: 'node', bundle: 'page', hydrate: 'never' })`,
    )
    expect(file.hydrate).toBeNull()
  })

  test('follows a changed definition', async () => {
    const file = await collect(
      `defineBlokkli({ bundle: 'text', hydrate: 'never' })`,
    )
    file.fileContents = file.fileContents.replace("'never'", "'visible'")
    await file.handleChange(helper)
    expect(file.hydrate).toBe('visible')
  })
})

// ============================================================================
// BlockCollector.validate
// ============================================================================

describe('BlockCollector.validate', () => {
  function validate(
    nuxtOptions: { ssr: boolean; lazyHydration: boolean },
    hydrate: BlockHydration | null,
  ) {
    const warn = vi.fn()
    const helper = {
      options: { pattern: [] },
      nuxt: {
        options: {
          ssr: nuxtOptions.ssr,
          experimental: { lazyHydration: nuxtOptions.lazyHydration },
        },
      },
      logger: { warn, error: vi.fn() },
    } as unknown as ModuleHelper
    const collector = new BlockCollector(helper, mockIcons)
    const file = createMockBlockFileWithPath('/path/to/Text.vue', {
      bundle: 'text',
      editor: { icon: 'text' },
    })
    file.hydrate = hydrate
    collector.files.set(file.filePath, file)

    return { hasErrors: collector.validate(mockIcons), warn }
  }

  test('warns once when lazy hydration is off', () => {
    const { hasErrors, warn } = validate(
      { ssr: true, lazyHydration: false },
      'never',
    )
    expect(hasErrors).toBe(false)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('experimental.lazyHydration')
    expect(warn.mock.calls[0]![0]).toContain('/path/to/Text.vue (never)')
  })

  test('does not warn with lazy hydration on', () => {
    const { warn } = validate({ ssr: true, lazyHydration: true }, 'never')
    expect(warn).not.toHaveBeenCalled()
  })

  test('does not warn without server-side rendering', () => {
    const { warn } = validate({ ssr: false, lazyHydration: false }, 'never')
    expect(warn).not.toHaveBeenCalled()
  })

  test('does not warn without blocks that have hydrate', () => {
    const { warn } = validate({ ssr: true, lazyHydration: false }, null)
    expect(warn).not.toHaveBeenCalled()
  })
})

// ============================================================================
// validateMissingMainComponent
// ============================================================================

describe('validateMissingMainComponent', () => {
  test('returns no errors when bundle has main component', () => {
    const files = [
      createMockBlockFileWithPath(
        '/path/to/Button.vue',
        { bundle: 'button' },
        'main',
      ),
    ]

    expect(validateMissingMainComponent(files)).toEqual([])
  })

  test('returns no errors when bundle has both main and context components', () => {
    const files = [
      createMockBlockFileWithPath(
        '/path/to/Button.vue',
        { bundle: 'button' },
        'main',
      ),
      createMockBlockFileWithPath(
        '/path/to/ButtonNested.vue',
        {
          bundle: 'button',
          renderFor: [{ parentBundle: 'grid' }],
        },
        'context',
      ),
    ]

    expect(validateMissingMainComponent(files)).toEqual([])
  })

  test('returns error when bundle only has context components', () => {
    const files = [
      createMockBlockFileWithPath(
        '/path/to/ButtonNested.vue',
        {
          bundle: 'button',
          renderFor: [{ parentBundle: 'grid' }],
        },
        'context',
      ),
    ]

    const errors = validateMissingMainComponent(files)
    expect(errors).toHaveLength(1)
    expect(errors[0]!.bundle).toBe('button')
    expect(errors[0]!.filePaths).toContain('/path/to/ButtonNested.vue')
  })

  test('returns error with all context component paths', () => {
    const files = [
      createMockBlockFileWithPath(
        '/path/to/ButtonGrid.vue',
        {
          bundle: 'button',
          renderFor: [{ parentBundle: 'grid' }],
        },
        'context',
      ),
      createMockBlockFileWithPath(
        '/path/to/ButtonInline.vue',
        {
          bundle: 'button',
          renderFor: [{ fieldListType: 'inline' }],
        },
        'context',
      ),
    ]

    const errors = validateMissingMainComponent(files)
    expect(errors).toHaveLength(1)
    expect(errors[0]!.bundle).toBe('button')
    expect(errors[0]!.filePaths).toHaveLength(2)
  })

  test('returns multiple errors for multiple bundles without main', () => {
    const files = [
      createMockBlockFileWithPath(
        '/path/to/ButtonNested.vue',
        {
          bundle: 'button',
          renderFor: [{ parentBundle: 'grid' }],
        },
        'context',
      ),
      createMockBlockFileWithPath(
        '/path/to/CardNested.vue',
        {
          bundle: 'card',
          renderFor: [{ parentBundle: 'grid' }],
        },
        'context',
      ),
    ]

    const errors = validateMissingMainComponent(files)
    expect(errors).toHaveLength(2)
  })

  test('handles empty files array', () => {
    expect(validateMissingMainComponent([])).toEqual([])
  })

  test('ignores bundles that have main component even with multiple context', () => {
    const files = [
      createMockBlockFileWithPath(
        '/path/to/Button.vue',
        { bundle: 'button' },
        'main',
      ),
      createMockBlockFileWithPath(
        '/path/to/ButtonGrid.vue',
        {
          bundle: 'button',
          renderFor: [{ parentBundle: 'grid' }],
        },
        'context',
      ),
      createMockBlockFileWithPath(
        '/path/to/ButtonInline.vue',
        {
          bundle: 'button',
          renderFor: [{ fieldListType: 'inline' }],
        },
        'context',
      ),
    ]

    expect(validateMissingMainComponent(files)).toEqual([])
  })

  test('only reports bundles without main, not those with main', () => {
    const files = [
      createMockBlockFileWithPath(
        '/path/to/Button.vue',
        { bundle: 'button' },
        'main',
      ),
      createMockBlockFileWithPath(
        '/path/to/ButtonNested.vue',
        {
          bundle: 'button',
          renderFor: [{ parentBundle: 'grid' }],
        },
        'context',
      ),
      createMockBlockFileWithPath(
        '/path/to/CardNested.vue',
        {
          bundle: 'card',
          renderFor: [{ parentBundle: 'grid' }],
        },
        'context',
      ),
    ]

    const errors = validateMissingMainComponent(files)
    expect(errors).toHaveLength(1)
    expect(errors[0]!.bundle).toBe('card')
  })
})

// ============================================================================
// validateBundleOptionCompatibility
// ============================================================================

describe('validateBundleOptionCompatibility', () => {
  function createCompatFile(
    filePath: string,
    definition: BlockDefinitionInputBase,
  ): CollectedBlockFile {
    const file = new CollectedBlockFile(filePath, '')
    ;(file as any).definition = definition
    return file
  }

  test('returns no conflicts when options have same type across components', () => {
    const files = [
      createCompatFile('/path/to/Button.vue', {
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
      createCompatFile('/path/to/ButtonNested.vue', {
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
      createCompatFile('/path/to/Button.vue', {
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
      createCompatFile('/path/to/ButtonNested.vue', {
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
    expect(conflicts[0]!.bundle).toBe('button')
    expect(conflicts[0]!.optionKey).toBe('color')
    expect(conflicts[0]!.reason).toBe('type')
    expect(conflicts[0]!.conflicts).toHaveLength(2)
    expect(conflicts[0]!.conflicts[0]!.type).toBe('radios')
    expect(conflicts[0]!.conflicts[1]!.type).toBe('checkbox')
  })

  test('returns conflict when radios have different option keys', () => {
    const files = [
      createCompatFile('/path/to/Button.vue', {
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
      createCompatFile('/path/to/ButtonNested.vue', {
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
    expect(conflicts[0]!.bundle).toBe('button')
    expect(conflicts[0]!.optionKey).toBe('background')
    expect(conflicts[0]!.reason).toBe('options')
    expect(conflicts[0]!.conflicts).toHaveLength(2)
    expect(conflicts[0]!.conflicts[0]!.optionKeys).toEqual(['dark', 'light'])
    expect(conflicts[0]!.conflicts[1]!.optionKeys).toEqual(['blue', 'red'])
  })

  test('returns conflict when checkboxes have different option keys', () => {
    const files = [
      createCompatFile('/path/to/Button.vue', {
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
      createCompatFile('/path/to/ButtonNested.vue', {
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
    expect(conflicts[0]!.reason).toBe('options')
  })

  test('returns no conflict when radios have same option keys', () => {
    const files = [
      createCompatFile('/path/to/Button.vue', {
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
      createCompatFile('/path/to/ButtonNested.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
        options: {
          background: {
            type: 'radios',
            label: 'Background',
            default: 'dark',
            options: { light: 'Helles', dark: 'Dunkles' },
          },
        },
      }),
    ]

    expect(validateBundleOptionCompatibility(files)).toEqual([])
  })

  test('returns no conflicts for different bundles with same option name', () => {
    const files = [
      createCompatFile('/path/to/Button.vue', {
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
      createCompatFile('/path/to/Card.vue', {
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
      createCompatFile('/path/to/Button.vue', {
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
      createCompatFile('/path/to/Button.vue', {
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
      createCompatFile('/path/to/ButtonNested.vue', {
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
      createCompatFile('/path/to/Button.vue', {
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
      createCompatFile('/path/to/ButtonNested.vue', {
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
      createCompatFile('/path/to/Button.vue', {
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
      createCompatFile('/path/to/ButtonNested.vue', {
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
      createCompatFile('/path/to/Button.vue', {
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
      createCompatFile('/path/to/ButtonNested.vue', {
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
      createCompatFile('/path/to/ButtonInline.vue', {
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
    expect(conflicts[0]!.conflicts).toHaveLength(3)
  })
})

// ============================================================================
// validateRenderForConflicts
// ============================================================================

describe('validateRenderForConflicts', () => {
  test('returns no conflicts when components have different renderFor entries', () => {
    const files = [
      createMockBlockFileForRenderFor('/path/to/Button.vue', {
        bundle: 'button',
      }),
      createMockBlockFileForRenderFor('/path/to/ButtonNested.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
      createMockBlockFileForRenderFor('/path/to/ButtonInline.vue', {
        bundle: 'button',
        renderFor: [{ fieldList: 'inline' }],
      }),
    ]

    expect(validateRenderForConflicts(files)).toEqual([])
  })

  test('returns conflict when two components have same parentBundle renderFor', () => {
    const files = [
      createMockBlockFileForRenderFor('/path/to/ButtonA.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
      createMockBlockFileForRenderFor('/path/to/ButtonB.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
    ]

    const conflicts = validateRenderForConflicts(files)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]!.bundle).toBe('button')
    expect(conflicts[0]!.variation).toBe('block:button__p:grid')
    expect(conflicts[0]!.filePaths).toHaveLength(2)
    expect(conflicts[0]!.filePaths).toContain('/path/to/ButtonA.vue')
    expect(conflicts[0]!.filePaths).toContain('/path/to/ButtonB.vue')
  })

  test('returns conflict when two components have same fieldList renderFor', () => {
    const files = [
      createMockBlockFileForRenderFor('/path/to/ButtonA.vue', {
        bundle: 'button',
        renderFor: [{ fieldList: 'inline' }],
      }),
      createMockBlockFileForRenderFor('/path/to/ButtonB.vue', {
        bundle: 'button',
        renderFor: [{ fieldList: 'inline' }],
      }),
    ]

    const conflicts = validateRenderForConflicts(files)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]!.variation).toBe('block:button__f:inline')
  })

  test('returns conflict when two components are main blocks (no renderFor)', () => {
    const files = [
      createMockBlockFileForRenderFor('/path/to/ButtonA.vue', {
        bundle: 'button',
      }),
      createMockBlockFileForRenderFor('/path/to/ButtonB.vue', {
        bundle: 'button',
      }),
    ]

    const conflicts = validateRenderForConflicts(files)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]!.bundle).toBe('button')
    expect(conflicts[0]!.variation).toBe('block:button')
    expect(conflicts[0]!.filePaths).toHaveLength(2)
  })

  test('returns no conflicts for different bundles with same renderFor', () => {
    const files = [
      createMockBlockFileForRenderFor('/path/to/Button.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
      createMockBlockFileForRenderFor('/path/to/Card.vue', {
        bundle: 'card',
        renderFor: [{ parentBundle: 'grid' }],
      }),
    ]

    expect(validateRenderForConflicts(files)).toEqual([])
  })

  test('returns conflict when overlapping renderFor arrays', () => {
    const files = [
      createMockBlockFileForRenderFor('/path/to/ButtonA.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }, { parentBundle: 'two_columns' }],
      }),
      createMockBlockFileForRenderFor('/path/to/ButtonB.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
    ]

    const conflicts = validateRenderForConflicts(files)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]!.variation).toBe('block:button__p:grid')
  })

  test('returns multiple conflicts for multiple overlapping entries', () => {
    const files = [
      createMockBlockFileForRenderFor('/path/to/ButtonA.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }, { fieldList: 'inline' }],
      }),
      createMockBlockFileForRenderFor('/path/to/ButtonB.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }, { fieldList: 'inline' }],
      }),
    ]

    const conflicts = validateRenderForConflicts(files)
    expect(conflicts).toHaveLength(2)
  })

  test('returns no conflicts for single component per bundle', () => {
    const files = [
      createMockBlockFileForRenderFor('/path/to/Button.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
    ]

    expect(validateRenderForConflicts(files)).toEqual([])
  })

  test('handles empty files array', () => {
    expect(validateRenderForConflicts([])).toEqual([])
  })

  test('detects conflict across three or more components', () => {
    const files = [
      createMockBlockFileForRenderFor('/path/to/ButtonA.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
      createMockBlockFileForRenderFor('/path/to/ButtonB.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
      createMockBlockFileForRenderFor('/path/to/ButtonC.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
    ]

    const conflicts = validateRenderForConflicts(files)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]!.filePaths).toHaveLength(3)
  })

  test('handles fieldListType renderFor', () => {
    const files = [
      createMockBlockFileForRenderFor('/path/to/ButtonA.vue', {
        bundle: 'button',
        renderFor: [{ fieldListType: 'sidebar' }],
      }),
      createMockBlockFileForRenderFor('/path/to/ButtonB.vue', {
        bundle: 'button',
        renderFor: [{ fieldListType: 'sidebar' }],
      }),
    ]

    const conflicts = validateRenderForConflicts(files)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]!.variation).toBe('block:button__f:sidebar')
  })
})
