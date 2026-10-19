import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { TEST_USERS } from '../../sandbox/control/shared/utils/testUsers'

// The control app's access links log in as the seeded test users: its list
// has to match the content and the roles' labels.
const drupal = new URL('../../sandbox/drupal/', import.meta.url)

const seeded = [
  ...readFileSync(new URL('content/users.yml', drupal), 'utf8').matchAll(
    /^ {2}name: (.+)\n(?: {2}.+\n)*? {2}roles: \[(\w+)\]$/gm,
  ),
].map(([, name, role]) => ({ name, role }))

describe('TEST_USERS', () => {
  test('the users of content/users.yml', () => {
    expect(seeded.length).toBeGreaterThan(0)
    expect(TEST_USERS.map(({ name, role }) => ({ name, role }))).toEqual(seeded)
  })

  test.each(TEST_USERS)('$role: its label', ({ role, label }) => {
    const config = readFileSync(
      new URL(`config/sync/user.role.${role}.yml`, drupal),
      'utf8',
    )
    const match = config.match(/^label: '?(.+?)'?$/m)
    expect(match?.[1]).toBe(label)
  })
})
