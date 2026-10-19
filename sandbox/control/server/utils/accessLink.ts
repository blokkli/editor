import { isLanguage } from '../../../frontend/shared/utils/languages'
import type { AccessError } from '../../shared/utils/claim'
import type { AccessLinkRow, SandboxRow } from './db'
import { sandboxLoginUrl } from './loginToken'
import { expires } from './sandboxes'

/**
 * Where an access link leads: a fresh login to its sandbox, or why not.
 * Without Nitro, for the unit test (test/unit/sandbox-access-link.test.ts).
 *
 * A sandbox is gone when its row says so, its database is missing or it has
 * expired: the cleanup marks a row up to 5 minutes late, and a deploy deletes
 * every sandbox.
 */
export function accessLinkTarget(options: {
  link: AccessLinkRow | undefined
  sandbox: SandboxRow | undefined
  // Whether the sandbox's database exists (sandboxExists()).
  exists: boolean
  // The sandbox's URL (sandboxUrl()).
  baseUrl: string
  secret: string
  time: number
}): { error: AccessError } | { url: string } {
  const { link, sandbox } = options
  if (!link || link.revoked) {
    return { error: 'unknown' }
  }
  if (
    !sandbox ||
    !sandbox.premium ||
    sandbox.deleted ||
    !options.exists ||
    expires(sandbox) <= options.time ||
    !isLanguage(sandbox.source)
  ) {
    return { error: 'gone' }
  }
  return {
    url: sandboxLoginUrl({
      secret: options.secret,
      sandbox: sandbox.id,
      baseUrl: options.baseUrl,
      user: link.user,
      source: sandbox.source,
      time: options.time,
    }),
  }
}
