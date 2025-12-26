import { test, describe, expect } from 'vitest'
import {
  validateRenderForConflicts,
  CollectedBlockFile,
} from '../src/module/Collector/Blocks'
import type { BlockDefinitionInputBase } from '../src/shared/types/definitions'

function createMockBlockFile(
  filePath: string,
  definition: BlockDefinitionInputBase,
): CollectedBlockFile {
  const file = new CollectedBlockFile(filePath, '')
  // Directly set the definition for testing
  ;(file as any).definition = definition

  // Calculate variations like the real implementation does
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
        } else {
          return `block:${bundle}__f:${v.fieldListType}`
        }
      })
      .sort()
  }

  return file
}

describe('validateRenderForConflicts', () => {
  test('returns no conflicts when components have different renderFor entries', () => {
    const files = [
      createMockBlockFile('/path/to/Button.vue', {
        bundle: 'button',
      }),
      createMockBlockFile('/path/to/ButtonNested.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
      createMockBlockFile('/path/to/ButtonInline.vue', {
        bundle: 'button',
        renderFor: [{ fieldList: 'inline' }],
      }),
    ]

    expect(validateRenderForConflicts(files)).toEqual([])
  })

  test('returns conflict when two components have same parentBundle renderFor', () => {
    const files = [
      createMockBlockFile('/path/to/ButtonA.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
      createMockBlockFile('/path/to/ButtonB.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
    ]

    const conflicts = validateRenderForConflicts(files)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].bundle).toBe('button')
    expect(conflicts[0].variation).toBe('block:button__p:grid')
    expect(conflicts[0].filePaths).toHaveLength(2)
    expect(conflicts[0].filePaths).toContain('/path/to/ButtonA.vue')
    expect(conflicts[0].filePaths).toContain('/path/to/ButtonB.vue')
  })

  test('returns conflict when two components have same fieldList renderFor', () => {
    const files = [
      createMockBlockFile('/path/to/ButtonA.vue', {
        bundle: 'button',
        renderFor: [{ fieldList: 'inline' }],
      }),
      createMockBlockFile('/path/to/ButtonB.vue', {
        bundle: 'button',
        renderFor: [{ fieldList: 'inline' }],
      }),
    ]

    const conflicts = validateRenderForConflicts(files)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].variation).toBe('block:button__f:inline')
  })

  test('returns conflict when two components are main blocks (no renderFor)', () => {
    const files = [
      createMockBlockFile('/path/to/ButtonA.vue', {
        bundle: 'button',
      }),
      createMockBlockFile('/path/to/ButtonB.vue', {
        bundle: 'button',
      }),
    ]

    const conflicts = validateRenderForConflicts(files)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].bundle).toBe('button')
    expect(conflicts[0].variation).toBe('block:button')
    expect(conflicts[0].filePaths).toHaveLength(2)
  })

  test('returns no conflicts for different bundles with same renderFor', () => {
    const files = [
      createMockBlockFile('/path/to/Button.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
      createMockBlockFile('/path/to/Card.vue', {
        bundle: 'card',
        renderFor: [{ parentBundle: 'grid' }],
      }),
    ]

    expect(validateRenderForConflicts(files)).toEqual([])
  })

  test('returns conflict when overlapping renderFor arrays', () => {
    const files = [
      createMockBlockFile('/path/to/ButtonA.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }, { parentBundle: 'two_columns' }],
      }),
      createMockBlockFile('/path/to/ButtonB.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
    ]

    const conflicts = validateRenderForConflicts(files)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].variation).toBe('block:button__p:grid')
  })

  test('returns multiple conflicts for multiple overlapping entries', () => {
    const files = [
      createMockBlockFile('/path/to/ButtonA.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }, { fieldList: 'inline' }],
      }),
      createMockBlockFile('/path/to/ButtonB.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }, { fieldList: 'inline' }],
      }),
    ]

    const conflicts = validateRenderForConflicts(files)
    expect(conflicts).toHaveLength(2)
  })

  test('returns no conflicts for single component per bundle', () => {
    const files = [
      createMockBlockFile('/path/to/Button.vue', {
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
      createMockBlockFile('/path/to/ButtonA.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
      createMockBlockFile('/path/to/ButtonB.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
      createMockBlockFile('/path/to/ButtonC.vue', {
        bundle: 'button',
        renderFor: [{ parentBundle: 'grid' }],
      }),
    ]

    const conflicts = validateRenderForConflicts(files)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].filePaths).toHaveLength(3)
  })

  test('handles fieldListType renderFor', () => {
    const files = [
      createMockBlockFile('/path/to/ButtonA.vue', {
        bundle: 'button',
        renderFor: [{ fieldListType: 'sidebar' }],
      }),
      createMockBlockFile('/path/to/ButtonB.vue', {
        bundle: 'button',
        renderFor: [{ fieldListType: 'sidebar' }],
      }),
    ]

    const conflicts = validateRenderForConflicts(files)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].variation).toBe('block:button__f:sidebar')
  })
})
