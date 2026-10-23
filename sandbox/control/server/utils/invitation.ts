import type { DatabaseSync } from 'node:sqlite'
import {
  isLanguage,
  type Language,
} from '../../../frontend/shared/utils/languages'
import { preferredLanguage } from './language'

/**
 * The access link of a used invitation, which its claim made. Opening the
 * invitation again logs in through it, so revoking that link ends the
 * invitation's logins too.
 */
export function invitationAccessToken(
  database: DatabaseSync,
  invitation: string,
): string | null {
  const row = database
    .prepare(
      'SELECT access_link FROM invitations WHERE token = ? AND used IS NOT NULL',
    )
    .get(invitation)
  return row?.access_link ? String(row.access_link) : null
}

/**
 * The claim page's language for a path (`/`, `/<lang>` or `/<lang>/`), or
 * null for any other page. `/` takes the browser's, as its redirect does
 * (server/middleware/language.ts).
 */
export function claimPageLanguage(
  pathname: string,
  acceptLanguage: string | undefined,
): Language | null {
  if (pathname === '/') {
    return preferredLanguage(acceptLanguage)
  }
  const segment = /^\/([^/]+)\/?$/.exec(pathname)?.[1]
  return isLanguage(segment) ? segment : null
}
