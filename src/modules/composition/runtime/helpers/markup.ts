// The rules of a composition's markup and CSS. The server checks against them,
// the agent's guide lists them: one place for both. No imports.

/**
 * The HTML elements a composition may use, besides the primitives. Each with
 * the attributes it takes on top of the global ones.
 */
export const ALLOWED_ELEMENTS: Record<string, string[]> = {
  section: [],
  div: [],
  header: [],
  footer: [],
  article: [],
  aside: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  h5: [],
  h6: [],
  p: [],
  span: [],
  strong: [],
  em: [],
  b: [],
  i: [],
  small: [],
  mark: [],
  sup: [],
  sub: [],
  abbr: [],
  br: [],
  hr: [],
  ul: [],
  ol: ['start', 'reversed'],
  li: [],
  dl: [],
  dt: [],
  dd: [],
  a: ['href', 'target'],
  figure: [],
  figcaption: [],
  blockquote: [],
  q: [],
  cite: [],
  time: ['datetime'],
  details: ['open'],
  summary: [],
  table: [],
  caption: [],
  thead: [],
  tbody: [],
  tfoot: [],
  tr: [],
  th: ['colspan', 'rowspan', 'scope'],
  td: ['colspan', 'rowspan'],
}

/** Attributes every allowed element takes. `id` and `class` are handled apart. */
export const GLOBAL_ATTRIBUTES = [
  'title',
  'lang',
  'dir',
  'hidden',
  'aria-label',
  'aria-hidden',
]

/** Elements inside a text: they get no id of their own. */
export const INLINE_ELEMENTS = new Set([
  'span',
  'strong',
  'em',
  'b',
  'i',
  'small',
  'mark',
  'sup',
  'sub',
  'abbr',
  'br',
  'a',
  'q',
  'cite',
  'time',
])

/** The at-rules the CSS may use. */
export const ALLOWED_AT_RULES = [
  'media',
  'container',
  'supports',
  'keyframes',
  'starting-style',
]

/** Functions the CSS may not use: they load something, or read the page. */
export const FORBIDDEN_FUNCTIONS = [
  'url',
  'image-set',
  '-webkit-image-set',
  'image',
  'cross-fade',
  'element',
  'src',
  'attr',
  'expression',
  'paint',
]

/** Selectors the CSS may not use: they leave the composition. */
export const FORBIDDEN_SELECTORS = [
  ':global',
  ':deep',
  ':slotted',
  '::v-deep',
  '::v-global',
  '::v-slotted',
  ':host',
  '>>>',
  '/deep/',
]

/**
 * A link the composition may render: http(s), mailto, tel, or one within the
 * site. Null for anything else (`javascript:`, `data:`, …).
 */
export function sanitizeUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  let url: URL
  try {
    // The URL parser drops tabs and line breaks, as browsers do: `java\nscript:`
    // is caught.
    url = new URL(trimmed, 'https://composition.invalid')
  } catch {
    return null
  }
  if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
    return null
  }
  return trimmed
}

/**
 * `Box` → `box`, `ArrowLink` → `arrow-link`. Null for a tag that doesn't
 * start with a capital: those are HTML elements.
 */
export function tagToPrimitiveId(tag: string): string | null {
  if (!/^[A-Z]/.test(tag)) return null
  return tag.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/** `arrow-link` → `ArrowLink`. */
export function primitiveIdToTag(id: string): string {
  return id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/** `text-color` → `textColor`. */
export function attributeToProp(name: string): string {
  return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

/** `textColor` → `text-color`. */
export function propToAttribute(name: string): string {
  return name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
}

/**
 * The option on a child paragraph that holds its key: the id of the tag that
 * places it. Copies of the paragraph keep it, unlike its UUID.
 */
export const CHILD_KEY_OPTION = 'bkCompositionKey'

/**
 * The elements a child may render as (`as="h2"`): those that hold a text or
 * are a box.
 */
export const CHILD_ELEMENTS = new Set([
  'div',
  'section',
  'article',
  'aside',
  'header',
  'footer',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'span',
  'small',
  'strong',
  'em',
  'mark',
  'cite',
  'q',
  'blockquote',
  'figcaption',
  'li',
  'dt',
  'dd',
  'summary',
  'caption',
  'th',
  'td',
])
