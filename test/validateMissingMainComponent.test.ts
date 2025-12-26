import { test, describe, expect } from 'vitest'
import {
  validateMissingMainComponent,
  CollectedBlockFile,
} from '../src/module/Collector/Blocks'
import type { ExtractedBlockDefinitionInput } from '../src/module/types'

function createMockBlockFile(
  filePath: string,
  definition: ExtractedBlockDefinitionInput,
  type: 'main' | 'context',
): CollectedBlockFile {
  const file = new CollectedBlockFile(filePath, '')
  ;(file as any).definition = definition
  ;(file as any).type = type
  return file
}

describe('validateMissingMainComponent', () => {
  test('returns no errors when bundle has main component', () => {
    const files = [
      createMockBlockFile('/path/to/Button.vue', { bundle: 'button' }, 'main'),
    ]

    expect(validateMissingMainComponent(files)).toEqual([])
  })

  test('returns no errors when bundle has both main and context components', () => {
    const files = [
      createMockBlockFile('/path/to/Button.vue', { bundle: 'button' }, 'main'),
      createMockBlockFile(
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
      createMockBlockFile(
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
    expect(errors[0].bundle).toBe('button')
    expect(errors[0].filePaths).toContain('/path/to/ButtonNested.vue')
  })

  test('returns error with all context component paths', () => {
    const files = [
      createMockBlockFile(
        '/path/to/ButtonGrid.vue',
        {
          bundle: 'button',
          renderFor: [{ parentBundle: 'grid' }],
        },
        'context',
      ),
      createMockBlockFile(
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
    expect(errors[0].bundle).toBe('button')
    expect(errors[0].filePaths).toHaveLength(2)
  })

  test('returns multiple errors for multiple bundles without main', () => {
    const files = [
      createMockBlockFile(
        '/path/to/ButtonNested.vue',
        {
          bundle: 'button',
          renderFor: [{ parentBundle: 'grid' }],
        },
        'context',
      ),
      createMockBlockFile(
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
      createMockBlockFile('/path/to/Button.vue', { bundle: 'button' }, 'main'),
      createMockBlockFile(
        '/path/to/ButtonGrid.vue',
        {
          bundle: 'button',
          renderFor: [{ parentBundle: 'grid' }],
        },
        'context',
      ),
      createMockBlockFile(
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
      // Button has main
      createMockBlockFile('/path/to/Button.vue', { bundle: 'button' }, 'main'),
      createMockBlockFile(
        '/path/to/ButtonNested.vue',
        {
          bundle: 'button',
          renderFor: [{ parentBundle: 'grid' }],
        },
        'context',
      ),
      // Card has no main
      createMockBlockFile(
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
    expect(errors[0].bundle).toBe('card')
  })
})
