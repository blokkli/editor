import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { premiumSandboxIds } from '../../sandbox/control/server/utils/premiumSandboxes'

const directories: string[] = []

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

function sandbox(id: string, lifetime?: unknown): string {
  const root = mkdtempSync(join(tmpdir(), 'premium-sandboxes-'))
  directories.push(root)
  const directory = join(root, id)
  mkdirSync(directory)
  if (lifetime !== undefined) {
    writeFileSync(join(directory, 'lifetime.json'), JSON.stringify(lifetime))
  }
  return root
}

describe('premiumSandboxIds', () => {
  test('missing directory', () => {
    expect(premiumSandboxIds(join(tmpdir(), 'no-such-sandboxes'))).toEqual([])
  })

  test('premium true, including one without an expiry', () => {
    const root = sandbox('ab', { expires: null, idle: null, premium: true })
    mkdirSync(join(root, 'cd'))
    writeFileSync(
      join(root, 'cd', 'lifetime.json'),
      JSON.stringify({ expires: 1, idle: 2, premium: false }),
    )
    mkdirSync(join(root, '_template'))
    expect(premiumSandboxIds(root)).toEqual(['ab'])
  })

  test('no lifetime file', () => {
    expect(premiumSandboxIds(sandbox('ab'))).toEqual([])
  })

  test('invalid JSON', () => {
    const root = sandbox('ab')
    writeFileSync(join(root, 'ab', 'lifetime.json'), '{')
    expect(() => premiumSandboxIds(root)).toThrow(/isn't valid JSON/)
  })
})
