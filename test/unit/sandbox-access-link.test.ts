import { createHmac } from 'node:crypto'
import { describe, expect, test } from 'vitest'
import { accessLinkTarget } from '../../sandbox/control/server/utils/accessLink'
import type {
  AccessLinkRow,
  SandboxRow,
} from '../../sandbox/control/server/utils/db'

// The control app's access links: a fresh login to a premium sandbox while
// it's there, else the claim page's "unknown" or "gone".
const time = 1_800_000_000
const secret = 'test-secret'
const baseUrl = 'https://abc123.blokkli.ddev.site'

const link: AccessLinkRow = {
  token: 'token',
  sandbox: 'abc123',
  user: 'Marc Brunner',
  note: '',
  created: time - 3600,
  revoked: null,
  last_used: null,
  uses: 0,
}

const sandbox: SandboxRow = {
  id: 'abc123',
  source: 'fr',
  premium: 1,
  created: time - 3600,
  deleted: null,
  ip_hash: null,
  invitation: 'invitation',
}

function target(
  overrides: Partial<Parameters<typeof accessLinkTarget>[0]> = {},
) {
  return accessLinkTarget({
    link,
    sandbox,
    exists: true,
    baseUrl,
    secret,
    time,
    ...overrides,
  })
}

describe('accessLinkTarget', () => {
  test('unknown token', () => {
    expect(target({ link: undefined })).toEqual({ error: 'unknown' })
  })

  test('revoked', () => {
    expect(target({ link: { ...link, revoked: time - 60 } })).toEqual({
      error: 'unknown',
    })
  })

  test('sandbox without a row', () => {
    expect(target({ sandbox: undefined })).toEqual({ error: 'gone' })
  })

  test('deleted', () => {
    expect(target({ sandbox: { ...sandbox, deleted: time - 60 } })).toEqual({
      error: 'gone',
    })
  })

  test('database missing', () => {
    expect(target({ exists: false })).toEqual({ error: 'gone' })
  })

  test('expired', () => {
    expect(
      target({ sandbox: { ...sandbox, created: time - 7 * 24 * 3600 } }),
    ).toEqual({ error: 'gone' })
  })

  test('not premium', () => {
    expect(target({ sandbox: { ...sandbox, premium: 0 } })).toEqual({
      error: 'gone',
    })
  })

  test('a login that Drupal accepts, to the welcome page', () => {
    const result = target()
    if (!('url' in result)) {
      throw new Error(`Expected a URL, got ${result.error}`)
    }
    const url = new URL(result.url)
    expect(url.origin).toBe(baseUrl)
    expect(url.searchParams.get('destination')).toBe('/fr/bienvenue')
    const match = url.pathname.match(/^\/blokkli-sandbox\/login\/([^/]+)$/)
    const [payload = '', signature] = (match?.[1] ?? '').split('.')
    // LoginToken.php: the signature, the sandbox, the user, the expiry.
    expect(signature).toBe(
      createHmac('sha256', secret).update(payload).digest('base64url'),
    )
    expect(JSON.parse(Buffer.from(payload, 'base64url').toString())).toEqual({
      sandbox: 'abc123',
      user: 'Marc Brunner',
      expires: time + 300,
    })
  })
})
