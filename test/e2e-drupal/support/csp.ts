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

/**
 * A Trusted Types report: the sink refused a string that starts with `start`.
 * Its sample is the sink and the value's first 40 characters.
 */
function refused(v: CspViolation, sink: string, start: string): boolean {
  return (
    v.directive === 'require-trusted-types-for' &&
    v.sample.startsWith(`${sink}|${start}`)
  )
}

/** A Trusted Types report: the sink refused an empty string. */
function refusedEmpty(v: CspViolation, sink: string): boolean {
  return v.directive === 'require-trusted-types-for' && v.sample === `${sink}|`
}

/**
 * The violations known today, each until its fix removes it: an entry names
 * its fix and matches its violations.
 *
 * The build reports Trusted Types without enforcing them
 * (sandbox/frontend/nuxt.config.ts). The editor's sinks have its policy; the
 * dependencies' need a `default` policy, as a project's would.
 */
const KNOWN: { fix: string; matches: (v: CspViolation) => boolean }[] = [
  {
    // elementFromString(), for the rich text editor's content.
    fix: "TipTap's DOMParser: the sandbox's default policy",
    matches: (v) => refused(v, 'DOMParser parseFromString', '<body>'),
  },
  {
    // A probe without markup, then the markup it converts.
    fix: "turndown's DOMParser: the sandbox's default policy",
    matches: (v) =>
      refusedEmpty(v, 'DOMParser parseFromString') ||
      refused(
        v,
        'DOMParser parseFromString',
        '<x-turndown id="turndown-root">',
      ),
  },
  {
    // Its SVG renderer, emptying its element.
    fix: "ECharts' innerHTML: the sandbox's default policy",
    matches: (v) => refusedEmpty(v, 'Element innerHTML'),
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
        source: `${e.sourceFile}:${e.lineNumber}:${e.columnNumber}`,
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
