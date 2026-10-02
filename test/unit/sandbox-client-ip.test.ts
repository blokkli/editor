import { describe, expect, test } from 'vitest'
import { clientIp } from '../../sandbox/control/server/utils/clientIp'

// The control app's per-IP claim limit: the ddev router and nginx append to
// X-Forwarded-For, a client can only prepend.
describe('clientIp', () => {
  test('the last public address, behind the proxies', () => {
    expect(clientIp('203.0.113.7, 172.18.0.4', '127.0.0.1')).toBe('203.0.113.7')
  })

  test('ignores what a client prepends', () => {
    expect(clientIp('198.51.100.1, 203.0.113.7, 172.18.0.4', '127.0.0.1')).toBe(
      '203.0.113.7',
    )
  })

  test('IPv6, and IPv4-mapped addresses', () => {
    expect(clientIp('2001:db8::1, fd00::2', '::1')).toBe('2001:db8::1')
    expect(clientIp('::ffff:203.0.113.7', '127.0.0.1')).toBe('203.0.113.7')
  })

  test('the first address when all are private (locally)', () => {
    expect(clientIp('172.18.0.1, 172.18.0.4', '127.0.0.1')).toBe('172.18.0.1')
  })

  test('skips what is not an address', () => {
    expect(clientIp('unknown, 203.0.113.7', '127.0.0.1')).toBe('203.0.113.7')
    expect(clientIp(undefined, '127.0.0.1')).toBe('127.0.0.1')
  })
})
