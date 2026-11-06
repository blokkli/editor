/**
 * The request headers to pass on to Drupal: the browser's cookies (the
 * session's, and the E2E tests' blokkli_e2e_public, see settings.php), and the
 * headers nginx uses to pick the site (Host) and Drupal uses for the session
 * cookie's name (https) and the client IP.
 */
export const FORWARDED_HEADERS = [
  'cookie',
  'user-agent',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
] as const

export function pickForwardedHeaders(
  headers: Record<string, string | undefined>,
): Record<string, string> {
  const forwarded: Record<string, string> = {}
  for (const name of FORWARDED_HEADERS) {
    const value = headers[name]
    if (value) {
      forwarded[name] = value
    }
  }
  return forwarded
}
