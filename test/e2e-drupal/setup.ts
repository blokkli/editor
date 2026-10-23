import { afterAll, afterEach } from 'vitest'
import { takeUnknownCspViolations } from './support/csp'

// Fails a test on a Content-Security-Policy violation that isn't known, and a
// file on one in its hooks (support/csp.ts). Registered first, so the file's
// own afterAll, which closes its pages, runs before this one.
function checkCsp() {
  const message = takeUnknownCspViolations()
  if (message) {
    throw new Error(message)
  }
}

afterEach(checkCsp)
afterAll(checkCsp)
