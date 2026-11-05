import type { Page } from 'playwright-core'

/**
 * The CSP check. The frontend sends a strict Content-Security-Policy
 * (sandbox/frontend/nuxt.config.ts), and so do Drupal's pages, the forms the
 * editor frames among them (the csp module,
 * sandbox/drupal/config/sync/csp.settings.yml). A test fails on any violation
 * that isn't known (../setup.ts checks after every test and every file). The
 * pages of `openEditor` and `openPage` record the violations of every document
 * they load: frames and navigations too.
 *
 * Under the policy, markup can't run script. A place that renders content as
 * markup shows up here, as a blocked inline handler, rather than as a canary
 * that ran (support/xss.ts).
 *
 * The build enforces Trusted Types. The editor's markup comes with its own
 * policy (src/runtime/editor/helpers/html); a string that a sink gets goes to
 * the page's `default` policy (sandbox/frontend/app/plugins/trustedTypes.client.ts),
 * which would hide a sink of the editor's without the policy. So every call of
 * the default policy is recorded too, and only the dependencies' are expected.
 */

export type CspViolation = {
  /** The violated directive, or `default-policy` for a call of that policy. */
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
 * The violations known today, each until its fix removes it: an entry names
 * its fix and matches its violations. None at the moment.
 */
const KNOWN: { fix: string; matches: (v: CspViolation) => boolean }[] = []

/**
 * A call of the default policy with a string that starts with `start`. Its
 * sample is the sink and the value's first 40 characters.
 */
function defaultPolicyGot(v: CspViolation, sink: string, start: string) {
  return (
    v.directive === 'default-policy' && v.sample.startsWith(`${sink}|${start}`)
  )
}

/** A call of the default policy with an empty string. */
function defaultPolicyGotEmpty(v: CspViolation, sink: string) {
  return v.directive === 'default-policy' && v.sample === `${sink}|`
}

/**
 * The dependencies' calls of the default policy, which a project's has to
 * handle too.
 */
const DEPENDENCIES: { name: string; matches: (v: CspViolation) => boolean }[] =
  [
    {
      name: "TipTap's elementFromString(), for the rich text editor's content",
      matches: (v) =>
        defaultPolicyGot(v, 'DOMParser parseFromString', '<body>'),
    },
    {
      name: 'turndown: a probe without markup, then the markup it converts',
      matches: (v) =>
        defaultPolicyGotEmpty(v, 'DOMParser parseFromString') ||
        defaultPolicyGot(
          v,
          'DOMParser parseFromString',
          '<x-turndown id="turndown-root">',
        ),
    },
    {
      name: "ECharts' SVG renderer, emptying its element",
      matches: (v) => defaultPolicyGotEmpty(v, 'Element innerHTML'),
    },
  ]

/** The dev server's tooling, which doesn't ship: the build has none of it. */
const DEV_TOOLING: { name: string; matches: (v: CspViolation) => boolean }[] = [
  {
    name: "Vue devtools' script in a framed page of Drupal's, whose policy blocks it",
    matches: (v) =>
      v.directive === 'script-src-elem' &&
      v.sample.startsWith(';(function detectIframeApp'),
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

    // Every call of the default policy, whose creation is wrapped for it.
    type CreateHTML = (value: string, type: string, sink: string) => unknown
    type Factory = {
      createPolicy(name: string, rules: { createHTML?: CreateHTML }): unknown
    }
    const factory = (window as { trustedTypes?: Factory }).trustedTypes
    if (!factory) {
      return
    }
    const createPolicy = factory.createPolicy.bind(factory)
    factory.createPolicy = (name, rules) => {
      const createHTML = rules.createHTML
      if (name !== 'default' || !createHTML) {
        return createPolicy(name, rules)
      }
      return createPolicy(name, {
        ...rules,
        createHTML(value, type, sink) {
          window.__bkCspViolation?.({
            directive: 'default-policy',
            blocked: 'trusted-types-default',
            // The frame that called the sink.
            source: new Error().stack?.split('\n')[2]?.trim() ?? '',
            sample: `${sink}|${value.slice(0, 40)}`,
            document: document.URL,
          })
          return createHTML(value, type, sink)
        },
      })
    }
  })
}

/** The violations since the last call that aren't known, as a message. */
export function takeUnknownCspViolations(): string | null {
  const unknown = violations.filter(
    (v) =>
      !KNOWN.some((k) => k.matches(v)) &&
      !DEPENDENCIES.some((d) => d.matches(v)) &&
      !DEV_TOOLING.some((d) => d.matches(v)),
  )
  violations.length = 0
  if (!unknown.length) {
    return null
  }
  return [
    `Content-Security-Policy violations (test/e2e-drupal/support/csp.ts):`,
    ...unknown.map((v) =>
      v.directive === 'default-policy'
        ? `- the default Trusted Types policy got ${JSON.stringify(v.sample)}, ${v.source}, in ${v.document}`
        : `- ${v.directive} blocked ${v.blocked} at ${v.source} in ${v.document}: ${JSON.stringify(v.sample)}`,
    ),
  ].join('\n')
}
