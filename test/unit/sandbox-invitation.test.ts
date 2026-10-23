import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { invitationAccessToken } from '../../sandbox/control/server/utils/invitation'

// Opening a used invitation again logs in through the access link its claim
// made, instead of saying it's used.
describe('invitationAccessToken', () => {
  let database: DatabaseSync

  function accessLink(token: string, sandbox: string, created: number) {
    database
      .prepare(
        'INSERT INTO access_links (token, sandbox, user, note, created) VALUES (?, ?, ?, ?, ?)',
      )
      .run(token, sandbox, 'Anna Keller', '', created)
  }

  beforeEach(() => {
    // The columns the query reads, as getDatabase() creates them.
    database = new DatabaseSync(':memory:')
    database.exec(`
      CREATE TABLE invitations (token TEXT PRIMARY KEY, note TEXT NOT NULL, created INTEGER NOT NULL, used INTEGER, sandbox TEXT);
      CREATE TABLE access_links (token TEXT PRIMARY KEY, sandbox TEXT NOT NULL, user TEXT NOT NULL, note TEXT NOT NULL, created INTEGER NOT NULL);
    `)
    database
      .prepare(
        'INSERT INTO invitations (token, note, created, used, sandbox) VALUES (?, ?, ?, ?, ?)',
      )
      .run('used', '', 100, 200, 'p1')
    database
      .prepare(
        'INSERT INTO invitations (token, note, created) VALUES (?, ?, ?)',
      )
      .run('fresh', '', 100)
  })

  afterEach(() => {
    database.close()
  })

  test("a used invitation's first access link", () => {
    accessLink('claimed', 'p1', 200)
    accessLink('later', 'p1', 300)
    accessLink('other', 'p2', 100)
    expect(invitationAccessToken(database, 'used')).toBe('claimed')
  })

  test('an unused invitation has none', () => {
    expect(invitationAccessToken(database, 'fresh')).toBeNull()
  })

  test('an unknown invitation has none', () => {
    expect(invitationAccessToken(database, 'nope')).toBeNull()
  })

  test('a used invitation without an access link has none', () => {
    expect(invitationAccessToken(database, 'used')).toBeNull()
  })
})
