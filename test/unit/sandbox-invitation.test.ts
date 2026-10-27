import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { migrate } from '../../sandbox/control/server/utils/db'
import {
  claimPageLanguage,
  invitationAccessToken,
} from '../../sandbox/control/server/utils/invitation'

// Opening a used invitation again logs in through the access link its claim
// made, instead of saying it's used.
let database: DatabaseSync

function invitation(
  token: string,
  sandbox: string | null,
  link: string | null,
) {
  database
    .prepare(
      'INSERT INTO invitations (token, note, created, used, sandbox, access_link) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(token, '', 100, sandbox ? 200 : null, sandbox, link)
}

function accessLink(token: string, sandbox: string, created: number) {
  database
    .prepare(
      'INSERT INTO access_links (token, sandbox, user, note, created) VALUES (?, ?, ?, ?, ?)',
    )
    .run(token, sandbox, 'Anna Keller', '', created)
}

describe('invitationAccessToken', () => {
  beforeEach(() => {
    database = new DatabaseSync(':memory:')
    migrate(database)
  })

  afterEach(() => {
    database.close()
  })

  test("a used invitation's access link, not the sandbox's first", () => {
    accessLink('colleague', 'p1', 150)
    accessLink('claimed', 'p1', 200)
    invitation('used', 'p1', 'claimed')
    expect(invitationAccessToken(database, 'used')).toBe('claimed')
  })

  test('a revoked access link is still the invitation’s', () => {
    // accessLinkTarget() then answers "unknown": revoking it ends the
    // invitation's logins, and no other link of the sandbox takes over.
    accessLink('claimed', 'p1', 200)
    accessLink('later', 'p1', 300)
    database
      .prepare('UPDATE access_links SET revoked = 400 WHERE token = ?')
      .run('claimed')
    invitation('used', 'p1', 'claimed')
    expect(invitationAccessToken(database, 'used')).toBe('claimed')
  })

  test('an unused invitation has none', () => {
    invitation('fresh', null, null)
    expect(invitationAccessToken(database, 'fresh')).toBeNull()
  })

  test('an unknown invitation has none', () => {
    expect(invitationAccessToken(database, 'nope')).toBeNull()
  })

  test('a used invitation without an access link has none', () => {
    accessLink('colleague', 'p1', 300)
    invitation('used', 'p1', null)
    expect(invitationAccessToken(database, 'used')).toBeNull()
  })
})

describe('migrate', () => {
  beforeEach(() => {
    // The schema before invitations stored their access link.
    database = new DatabaseSync(':memory:')
    database.exec(`
      CREATE TABLE invitations (token TEXT PRIMARY KEY, note TEXT NOT NULL, created INTEGER NOT NULL, used INTEGER, sandbox TEXT);
      CREATE TABLE access_links (token TEXT PRIMARY KEY, sandbox TEXT NOT NULL, user TEXT NOT NULL, note TEXT NOT NULL, created INTEGER NOT NULL, revoked INTEGER, last_used INTEGER, uses INTEGER NOT NULL DEFAULT 0);
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

  test("gives a used invitation its sandbox's first access link", () => {
    accessLink('later', 'p1', 300)
    accessLink('claimed', 'p1', 200)
    migrate(database)
    expect(invitationAccessToken(database, 'used')).toBe('claimed')
    expect(invitationAccessToken(database, 'fresh')).toBeNull()
  })

  test('runs again without changes', () => {
    accessLink('claimed', 'p1', 200)
    migrate(database)
    database
      .prepare('UPDATE invitations SET access_link = ? WHERE token = ?')
      .run('kept', 'used')
    migrate(database)
    expect(invitationAccessToken(database, 'used')).toBe('kept')
  })
})

describe('claimPageLanguage', () => {
  test.each([
    ['/fr', 'fr'],
    ['/fr/', 'fr'],
    ['/en', 'en'],
  ] as const)('%s is the claim page in %s', (path, language) => {
    expect(claimPageLanguage(path, 'de')).toBe(language)
  })

  test("/ is the claim page in the browser's language", () => {
    expect(claimPageLanguage('/', 'fr-CH,fr;q=0.9')).toBe('fr')
    expect(claimPageLanguage('/', undefined)).toBe('de')
  })

  test.each(['/admin', '/xx', '/fr/x', '/access/abc', '//'])(
    '%s is not the claim page',
    (path) => {
      expect(claimPageLanguage(path, 'fr')).toBeNull()
    },
  )
})
