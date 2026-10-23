import type { Page } from 'playwright-core'

/**
 * The CSP check (plans/xss, step 8). The frontend sends a strict
 * Content-Security-Policy (sandbox/frontend/nuxt.config.ts), and a test fails
 * on any violation of it that isn't known (../setup.ts checks after every test
 * and every file). The pages of `openEditor` and `openPage` record the
 * violations of every document they load: frames and navigations too.
 *
 * Under the policy, markup can't run script. A place that renders content as
 * markup shows up here, as a blocked inline handler, rather than as a canary
 * that ran (support/xss.ts).
 */

export type CspViolation = {
  directive: string
  blocked: string
  source: string
  sample: string
  document: string
}

declare global {
  interface Window {
    __bkCspViolation?: (violation: CspViolation) => void
  }
}

/** The violations known today, each until its fix removes it. */
const KNOWN: { fix: string; matches: (v: CspViolation) => boolean }[] = [
  {
    // It tries `new Function` once, and falls back.
    fix: "zod's eval probe: z.config({ jitless: true })",
    matches: (v) =>
      v.blocked === 'eval' && v.sample.startsWith('(function anonymous(\n) {'),
  },
  {
    fix: "TipTap's base CSS: injectCSS: false",
    matches: (v) =>
      v.directive === 'style-src-elem' && v.sample.startsWith('.ProseMirror {'),
  },
  {
    fix: "loader.svg's <style>",
    matches: (v) =>
      v.directive === 'style-src-elem' && v.sample.startsWith('.spinner_b2T7{'),
  },
  {
    fix: "spinner.svg's style attribute",
    matches: (v) =>
      v.directive === 'style-src-attr' && v.sample === 'opacity: 0.3',
  },
  {
    fix: "the clipboard's YouTube thumbnail",
    matches: (v) =>
      v.directive === 'img-src' &&
      /^https?:\/\/i3\.ytimg\.com\//.test(v.blocked),
  },
]

const violations: CspViolation[] = []

/** Records the page's violations, in every document it loads from now on. */
export async function installCspCheck(page: Page): Promise<void> {
  await page.exposeBinding(
    '__bkCspViolation',
    (_source, violation: CspViolation) => {
      violations.push(violation)
    },
  )
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__bkCspViolation?.({
        directive: e.effectiveDirective,
        blocked: e.blockedURI,
        source: `${e.sourceFile}:${e.lineNumber}`,
        sample: e.sample,
        document: e.documentURI,
      })
    })
  })
}

/** The violations since the last call that aren't known, as a message. */
export function takeUnknownCspViolations(): string | null {
  const unknown = violations.filter((v) => !KNOWN.some((k) => k.matches(v)))
  violations.length = 0
  if (!unknown.length) {
    return null
  }
  return [
    `Content-Security-Policy violations (test/e2e-drupal/support/csp.ts):`,
    ...unknown.map(
      (v) =>
        `- ${v.directive} blocked ${v.blocked} at ${v.source} in ${v.document}: ${JSON.stringify(v.sample)}`,
    ),
  ].join('\n')
}
