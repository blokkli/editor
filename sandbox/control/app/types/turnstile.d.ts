// Cloudflare's Turnstile script, which the claim page loads: only what the
// page uses.
interface Window {
  turnstile?: { reset: () => void }
}
