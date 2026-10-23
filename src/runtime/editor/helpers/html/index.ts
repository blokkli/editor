import createDOMPurify from 'dompurify'
import type { Config, DOMPurify } from 'dompurify'
import { escapeHtml } from '#blokkli/editor/helpers/string'

/** What the editor uses of a Trusted Types policy. */
type HtmlPolicy = {
  createHTML(html: string): unknown
  createScriptURL(url: string): unknown
}

type TrustedTypesFactory = {
  createPolicy(name: string, rules: HtmlPolicy): HtmlPolicy
}

let policy: HtmlPolicy | null | undefined

/**
 * The editor's Trusted Types policy, `blokkli` (plans/xss, step 8). It vouches
 * for any markup, so it never leaves this module: it's for markup parsed into a
 * document without a window, where nothing loads or runs, and for what
 * DOMPurify returns. A page that enforces Trusted Types has to allow it
 * (`trusted-types blokkli`). Without Trusted Types, or if the page refuses the
 * name, the editor passes strings.
 */
function getPolicy(): HtmlPolicy | null {
  if (policy === undefined) {
    policy = null
    const factory = (globalThis as { trustedTypes?: TrustedTypesFactory })
      .trustedTypes
    try {
      policy =
        factory?.createPolicy('blokkli', {
          createHTML: (html) => html,
          // DOMPurify asks only for the attributes that load a script, which
          // no profile keeps.
          createScriptURL: () => {
            throw new TypeError('blökkli vouches for no script URL.')
          },
        }) ?? null
    } catch {
      // The page's `trusted-types` doesn't allow the name.
    }
  }
  return policy
}

/**
 * Markup as the policy vouches for it. The DOM's types know strings only,
 * while the sinks take the policy's values too.
 */
function trusted(html: string): string {
  const htmlPolicy = getPolicy()
  return htmlPolicy ? (htmlPolicy.createHTML(html) as string) : html
}

let inertDocument: Document | null = null

/**
 * Parse markup into a `<div>` of a document without a window, as setting a
 * `<div>`'s `innerHTML` parses it. Nothing in that document is loaded or run:
 * its images aren't fetched, its event handlers never fire.
 *
 * Use it for markup that's read, never shown: a stored value, a paste. Don't
 * move its nodes into the page, where they would load and run.
 */
export function parseHtml(html: string): HTMLDivElement {
  inertDocument ??= document.implementation.createHTMLDocument('')
  const container = inertDocument.createElement('div')
  // eslint-disable-next-line no-restricted-syntax -- the inert document's own element
  container.innerHTML = trusted(html)
  return container
}

/**
 * Parse markup into a document of its own, as `DOMParser` does: a document
 * without a window, as parseHtml()'s. For when the document is needed, its
 * `body` or a selector over all of it.
 */
export function parseHtmlDocument(html: string): Document {
  // eslint-disable-next-line no-restricted-syntax -- this is the place
  return new DOMParser().parseFromString(trusted(html), 'text/html')
}

/**
 * Set the markup of an element of parseHtml()'s or parseHtmlDocument()'s
 * document, as setting its `innerHTML` does. Throws for an element of a
 * document with a window, where the markup would load and run.
 */
export function setInertHtml(element: Element, html: string): void {
  if (element.ownerDocument.defaultView) {
    throw new Error('setInertHtml() is for documents without a window.')
  }
  // eslint-disable-next-line no-restricted-syntax -- an element of a document without a window
  element.innerHTML = trusted(html)
}

/**
 * What markup may hold once it's sanitised.
 *
 * - `richText`: a formatted field's value, and a diff of one. HTML without
 *   scripts, event handlers, `javascript:` URLs, SVG or MathML; style elements
 *   and forms aren't rich text either. Classes and data attributes stay.
 * - `markdown`: what `marked` renders, a chat message. Only the elements that
 *   markdown produces, without images: an image loads when it's shown, so a
 *   prompt injection could send data out in its URL. The disabled checkboxes of
 *   task lists stay; without a form, they send nothing.
 * - `comment`: what the comment editor (`RichText/Editor`) writes: formatting,
 *   lists, task items, links, mentions and emoji. As Drupal's comment format
 *   allows it, plus the emoji's name.
 */
export type SanitizeProfile = 'richText' | 'markdown' | 'comment'

const PROFILES: Record<SanitizeProfile, Config> = {
  richText: {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'select', 'textarea'],
  },
  markdown: {
    ALLOWED_TAGS: [
      'a',
      'blockquote',
      'br',
      'code',
      'del',
      'em',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'hr',
      'input',
      'li',
      'ol',
      'p',
      'pre',
      'span',
      'strong',
      'table',
      'tbody',
      'td',
      'th',
      'thead',
      'tr',
      'ul',
    ],
    ALLOWED_ATTR: [
      'align',
      'checked',
      'class',
      'disabled',
      'href',
      'start',
      'title',
      'type',
    ],
    ALLOW_DATA_ATTR: false,
  },
  comment: {
    ALLOWED_TAGS: [
      'a',
      'blockquote',
      'br',
      'code',
      'em',
      'li',
      'ol',
      'p',
      'pre',
      's',
      'span',
      'strong',
      'u',
      'ul',
    ],
    ALLOWED_ATTR: [
      'class',
      'data-checked',
      'data-id',
      'data-label',
      'data-name',
      'data-type',
      'href',
      'hreflang',
    ],
    ALLOW_DATA_ATTR: false,
  },
}

// An instance of our own: hooks and settings that a project adds to DOMPurify's
// shared instance don't change what the editor lets through.
let purify: DOMPurify | null = null

function sanitize(
  html: string,
  profile: SanitizeProfile,
  returnTrustedType: boolean,
): string {
  purify ??= createDOMPurify()
  if (!purify.isSupported) {
    // Without a DOM (no window), DOMPurify would return the markup as it is.
    return escapeHtml(html)
  }
  return purify.sanitize(html, {
    ...PROFILES[profile],
    // DOMPurify parses and returns through the editor's policy. Without it,
    // DOMPurify creates its own (`dompurify`).
    TRUSTED_TYPES_POLICY: (getPolicy() ??
      undefined) as Config['TRUSTED_TYPES_POLICY'],
    RETURN_TRUSTED_TYPE: returnTrustedType,
  }) as string
}

/**
 * Remove everything from markup that the profile doesn't allow, before the
 * editor shows it.
 *
 * Use it for what's shown only: a stored or proposed value keeps its markup.
 */
export function sanitizeHtml(html: string, profile: SanitizeProfile): string {
  return sanitize(html, profile, false)
}

/**
 * Set markup as an element's, sanitised as sanitizeHtml() does it: for an
 * element of the page.
 */
export function setSanitizedHtml(
  element: Element,
  html: string,
  profile: SanitizeProfile,
): void {
  // eslint-disable-next-line no-restricted-syntax -- sanitised, as Trusted Types want it
  element.innerHTML = sanitize(html, profile, true)
}
