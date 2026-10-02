import { BlockList, isIPv4, isIPv6 } from 'node:net'

const PRIVATE = new BlockList()
PRIVATE.addSubnet('10.0.0.0', 8, 'ipv4')
PRIVATE.addSubnet('127.0.0.0', 8, 'ipv4')
PRIVATE.addSubnet('169.254.0.0', 16, 'ipv4')
PRIVATE.addSubnet('172.16.0.0', 12, 'ipv4')
PRIVATE.addSubnet('192.168.0.0', 16, 'ipv4')
PRIVATE.addAddress('::1', 'ipv6')
PRIVATE.addSubnet('fc00::', 7, 'ipv6')
PRIVATE.addSubnet('fe80::', 10, 'ipv6')

/**
 * An address, or null for anything else. IPv4-mapped IPv6 addresses
 * (::ffff:1.2.3.4) become IPv4.
 */
function normalize(value: string): string | null {
  const address = value.trim().replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, '')
  return isIPv4(address) || isIPv6(address) ? address.toLowerCase() : null
}

function isPrivate(address: string): boolean {
  return PRIVATE.check(address, isIPv4(address) ? 'ipv4' : 'ipv6')
}

/**
 * The client's IP, from the chain of X-Forwarded-For and the connection's
 * address: the last address that isn't a private one. The proxies (the ddev
 * router, nginx) append theirs, a client can only prepend. When every address
 * is private, as locally, the first one.
 */
export function clientIp(
  forwardedFor: string | undefined,
  remoteAddress: string | undefined,
): string {
  const chain = [...(forwardedFor ?? '').split(','), remoteAddress ?? '']
    .map(normalize)
    .filter((address) => address !== null)
  return chain.findLast((address) => !isPrivate(address)) ?? chain[0] ?? ''
}
