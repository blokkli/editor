/**
 * Whether Cloudflare accepts a Turnstile response (the claim page's widget).
 * A failed request counts as a rejection.
 */
export async function verifyTurnstile(
  secret: string,
  response: string,
  ip: string,
): Promise<boolean> {
  try {
    const result = await $fetch<{ success?: boolean }>(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: { secret, response, remoteip: ip } },
    )
    return result.success === true
  } catch (error) {
    console.error('Turnstile:', error)
    return false
  }
}
