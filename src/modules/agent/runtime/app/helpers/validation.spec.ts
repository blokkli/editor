import { describe, it, expect } from 'vitest'
import type { BlokkliApp } from '#blokkli/editor/types/app'
import { requireNotMovedIntoItself } from './validation'

// The page holds a grid and a button. The grid holds the inner grid, which
// holds a button.
const HOSTS: Record<string, string> = {
  grid: 'page',
  button: 'page',
  inner: 'grid',
  deep: 'inner',
}

function isChildOf(childUuid: string, parentUuid: string): boolean {
  const host = HOSTS[childUuid]
  return !!host && (host === parentUuid || isChildOf(host, parentUuid))
}

const app = { state: { isChildOf } } as unknown as BlokkliApp

describe('requireNotMovedIntoItself', () => {
  it('moves blocks into a block that is not one of them', () => {
    expect(requireNotMovedIntoItself(app, ['grid'], 'page')).toBeUndefined()
    expect(
      requireNotMovedIntoItself(app, ['inner', 'button'], 'grid'),
    ).toBeUndefined()
  })

  it('does not move a block into itself', () => {
    expect(requireNotMovedIntoItself(app, ['button', 'grid'], 'grid')).toEqual({
      error:
        'Paragraph grid cannot be moved into itself or into a paragraph nested in it',
    })
  })

  it('does not move a block into a block nested in it, at any depth', () => {
    for (const parent of ['inner', 'deep']) {
      expect(requireNotMovedIntoItself(app, ['grid'], parent)).toEqual({
        error:
          'Paragraph grid cannot be moved into itself or into a paragraph nested in it',
      })
    }
  })
})
