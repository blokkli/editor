// The composition module: editors and the agent compose bespoke sections from
// the primitives and the design tokens a project defines.
//
// This file has no imports: the build evaluates the project's definitions with
// jiti to write the class safelist, and they import their helpers from here.

/**
 * A value that may differ per breakpoint: either one value for all widths, or
 * an object with a `base` value and overrides keyed by breakpoint id.
 */
export type CompositionResponsiveValue<T = string> =
  | T
  | ({ base?: T } & Record<string, T | undefined>)

/**
 * A text: a plain string, or a value per language code.
 */
export type CompositionText = string | Record<string, string>

export type CompositionToken = {
  /**
   * What replaces `{token}` in a prop's class template, e.g. `surface` for
   * `bg-{token}`.
   */
  value: string
  label?: string
  /** What the token is for. The agent reads it. */
  description?: string
  /** A CSS colour for the editor's swatch, e.g. `var(--color-surface)`. */
  swatch?: string
  /** The value of the group's custom property for this token. */
  propertyValue?: string
}

export type CompositionTokenGroup = {
  label: string
  description?: string
  tokens: Record<string, CompositionToken>
  /**
   * The custom property the agent's CSS uses for a token of the group, e.g.
   * `--color-{name}`. `{name}` is the token's name.
   */
  property?: string
  /**
   * The value of that property, when the site's theme doesn't have it: every
   * composition defines it. `{token}` is the token's value, e.g.
   * `calc(var(--spacing) * {token})`. A token's own `propertyValue` wins.
   */
  propertyValue?: string
}

export type CompositionBreakpoint = {
  label: string
  /** The Tailwind variant that applies a class from this width on. */
  variant: string
  /** The width it starts at, for the agent's `@container` rules. */
  minWidth?: string
  description?: string
}

/**
 * How wide a composition is for a given window width: the window's width less
 * an inset, at most `maxWidth`. In CSS pixels.
 */
export type CompositionLayout = {
  maxWidth: number
  /** The inset from a window width on, e.g. the gutters left and right. */
  inset: { from: number; inset: number }[]
}

export type CompositionTokens = {
  /** Classes on the element around a composition, e.g. `@container`. */
  rootClass?: string
  /** From the smallest to the largest. */
  breakpoints: Record<string, CompositionBreakpoint>
  groups: Record<string, CompositionTokenGroup>
  /** For the sizes of the images in a composition. */
  layout?: CompositionLayout
}

type PropBase = {
  label: string
  /** What the prop does. The agent reads it. */
  description?: string
}

export type CompositionPropToken = PropBase & {
  type: 'token'
  /** The token group the values come from. */
  group: string
  /** The class template, e.g. `gap-{token}` or `px-{token} py-{token}`. */
  class: string
  responsive?: boolean
  default?: string
}

export type CompositionPropEnum = PropBase & {
  type: 'enum'
  options: Record<
    string,
    { label: string; description?: string; class?: string }
  >
  responsive?: boolean
  default?: string
}

export type CompositionPropText = PropBase & {
  type: 'text'
  multiline?: boolean
  default?: string
}

export type CompositionPropUrl = PropBase & {
  type: 'url'
  default?: string
}

export type CompositionPropBoolean = PropBase & {
  type: 'boolean'
  /** Applied while the value is true. */
  class?: string
  default?: boolean
}

export type CompositionProp =
  | CompositionPropToken
  | CompositionPropEnum
  | CompositionPropText
  | CompositionPropUrl
  | CompositionPropBoolean

export type CompositionSlot = {
  label: string
  description?: string
  /** The primitives the slot takes. All of them when not set. */
  allowed?: string[]
}

export type CompositionPrimitiveDefinition = {
  label: string
  /** What the primitive is for. The agent reads it. */
  description: string
  icon?: string
  props: Record<string, CompositionProp>
  slots?: Record<string, CompositionSlot>
}

export type CompositionPrimitive = CompositionPrimitiveDefinition & {
  id: string
}

export function defineCompositionPrimitive(
  id: string,
  definition: CompositionPrimitiveDefinition,
): CompositionPrimitive {
  return { id, ...definition }
}

export function defineCompositionTokens(
  tokens: CompositionTokens,
): CompositionTokens {
  return tokens
}

/**
 * What's stored: the markup the agent wrote, with its `<style>` blocks.
 */
export type CompositionDocument = {
  version: 2
  source: string
}

/** Where a part is in the source: offsets of its first and after its last character. */
export type CompositionSourceRange = { start: number; end: number }

/**
 * How an image is shown, as the agent writes it (`:image-style`): its share of
 * the composition's width and its ratio, per breakpoint.
 */
export type CompositionImageStyle = {
  /** A percentage of the composition's width, e.g. `50%`. */
  width?: CompositionResponsiveValue<string>
  /** Width over height, e.g. `4/3`. The image is cropped to fill it. */
  ratio?: CompositionResponsiveValue<string>
  /** Above the fold: loaded first, not lazily. */
  priority?: boolean
}

/**
 * What a child's component gets for its image: the sizes in window widths,
 * which the site's image style turns into sources.
 */
export type CompositionImagePlacement = {
  /** The `sizes` attribute. */
  sizes: string
  /**
   * From a window width on: the largest width the image is shown at, in CSS
   * pixels, and its ratio (width over height) if it's cropped.
   */
  widths: { from: number; width: number; ratio?: number }[]
  /** The largest width it's shown at, in CSS pixels. */
  maxWidth: number
  /** Cropped to a ratio: the image covers its box. */
  cover: boolean
  priority: boolean
}

/**
 * The tree the renderer gets from the server. It only holds what the server
 * accepted: known primitives with checked props, allowed elements with allowed
 * attributes, and text.
 */
export type CompositionRenderNode =
  | { kind: 'text'; text: string }
  | {
      kind: 'element'
      id?: string
      tag: string
      attrs: Record<string, string>
      class?: string
      loc: CompositionSourceRange
      children: CompositionRenderNode[]
    }
  | {
      kind: 'primitive'
      id: string
      /** The id of a primitive. */
      type: string
      props: Record<string, unknown>
      class?: string
      loc: CompositionSourceRange
      slots: Record<string, CompositionRenderNode[]>
    }
  | {
      /** A paragraph in the composition's field, placed here. */
      kind: 'child'
      /** The child's key. */
      id: string
      /** The paragraph type. */
      bundle: string
      class?: string
      /** The element the child renders, if the markup says (`as="h2"`). */
      as?: string
      loc: CompositionSourceRange
      placement?: CompositionImagePlacement
    }

export type CompositionError = {
  message: string
  line?: number
  column?: number
}

/** A child as the source places it, with the field values it sets. */
export type CompositionChildReference = {
  /** The child's key. */
  id: string
  bundle: string
  /** Attributes other than the structure's, e.g. `media="42"`: field values. */
  fields: Record<string, string>
  /**
   * What's between its tags: the value of its text field. `html` as written,
   * `text` the plain text, or null if it holds elements. Null without content.
   */
  content: { html: string; text: string | null } | null
  /**
   * Where its content goes in the stored source, which has none: the offset
   * between its tags.
   */
  contentAt: number
}

export type CompiledComposition = {
  /**
   * The source as it's stored: an id on every part that had none, and the
   * children's field values taken out (they belong to the children).
   */
  source: string
  /** Every child the source places, in order. */
  children: CompositionChildReference[]
  tree: CompositionRenderNode[]
  /** The scoped, checked CSS. */
  css: string
  /** The attribute every element of the composition has, e.g. `data-v-c1x9z`. */
  scope: string
  errors: CompositionError[]
}
