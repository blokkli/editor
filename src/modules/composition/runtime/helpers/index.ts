import type {
  CompositionDocument,
  CompositionPrimitive,
  CompositionProp,
  CompositionTokens,
} from '../types'

// Plain functions only: the build imports this file to write the safelist.

export function emptyDocument(): CompositionDocument {
  return { version: 2, source: '' }
}

/**
 * The stored document: an object, or its JSON.
 */
export function parseDocument(raw: unknown): CompositionDocument {
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return emptyDocument()
    }
  }
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as CompositionDocument).source === 'string'
  ) {
    return { version: 2, source: (value as CompositionDocument).source }
  }
  return emptyDocument()
}

function splitClasses(value: string): string[] {
  return value.split(/\s+/).filter(Boolean)
}

function withVariant(classes: string[], variant: string | undefined): string[] {
  if (!variant) {
    return classes
  }
  return classes.map((c) => `${variant}:${c}`)
}

/**
 * The classes of one value of a prop, without a breakpoint variant.
 */
function getValueClasses(
  prop: CompositionProp,
  value: unknown,
  tokens: CompositionTokens,
): string[] {
  if (prop.type === 'token') {
    if (typeof value !== 'string') return []
    const token = tokens.groups[prop.group]?.tokens[value]
    if (!token) return []
    return splitClasses(prop.class.split('{token}').join(token.value))
  }
  if (prop.type === 'enum') {
    if (typeof value !== 'string') return []
    const option = prop.options[value]
    return option?.class ? splitClasses(option.class) : []
  }
  if (prop.type === 'boolean') {
    return value === true && prop.class ? splitClasses(prop.class) : []
  }
  return []
}

export function isResponsiveObject(
  value: unknown,
): value is Record<string, string | undefined> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * The classes of a primitive's props: each of its token, enum and boolean
 * props, per breakpoint.
 */
export function getNodeClasses(
  props: Record<string, unknown>,
  primitive: CompositionPrimitive,
  tokens: CompositionTokens,
): string[] {
  const classes: string[] = []
  for (const [key, prop] of Object.entries(primitive.props)) {
    const value = props[key] ?? prop.default
    if (value === undefined || value === null) continue

    if (
      (prop.type === 'token' || prop.type === 'enum') &&
      isResponsiveObject(value)
    ) {
      for (const [breakpoint, v] of Object.entries(value)) {
        const variant =
          breakpoint === 'base'
            ? undefined
            : tokens.breakpoints[breakpoint]?.variant
        if (breakpoint !== 'base' && !variant) continue
        classes.push(...withVariant(getValueClasses(prop, v, tokens), variant))
      }
      continue
    }
    classes.push(...getValueClasses(prop, value, tokens))
  }
  return classes
}

/**
 * Every class a primitive can render: what Tailwind has to generate.
 */
export function getAllClasses(
  primitives: CompositionPrimitive[],
  tokens: CompositionTokens,
): string[] {
  const all = new Set<string>(splitClasses(tokens.rootClass ?? ''))
  const variants = Object.values(tokens.breakpoints).map((b) => b.variant)

  for (const primitive of primitives) {
    for (const prop of Object.values(primitive.props)) {
      let values: string[][] = []
      if (prop.type === 'token') {
        values = Object.keys(tokens.groups[prop.group]?.tokens ?? {}).map(
          (name) => getValueClasses(prop, name, tokens),
        )
      } else if (prop.type === 'enum') {
        values = Object.keys(prop.options).map((name) =>
          getValueClasses(prop, name, tokens),
        )
      } else if (prop.type === 'boolean') {
        values = [getValueClasses(prop, true, tokens)]
      }
      for (const classes of values) {
        classes.forEach((c) => all.add(c))
        if ('responsive' in prop && prop.responsive) {
          for (const variant of variants) {
            withVariant(classes, variant).forEach((c) => all.add(c))
          }
        }
      }
    }
  }
  return [...all].sort()
}

/**
 * The value of a prop that isn't rendered as classes, for the base width.
 */
export function resolveBaseValue(value: unknown): unknown {
  if (isResponsiveObject(value)) {
    return value.base
  }
  return value
}

/**
 * The custom properties of the token groups that the site's theme doesn't
 * have, as `name: value` pairs: every composition defines them.
 */
export function getTokenProperties(tokens: CompositionTokens): string[] {
  const result: string[] = []
  for (const group of Object.values(tokens.groups)) {
    if (!group.property) continue
    for (const [name, token] of Object.entries(group.tokens)) {
      const template = token.propertyValue ?? group.propertyValue
      if (!template) continue
      const property = group.property.split('{name}').join(name)
      result.push(`${property}: ${template.split('{token}').join(token.value)}`)
    }
  }
  return result
}

/**
 * How the agent's CSS refers to a token: `var(--color-primary)`.
 */
export function getTokenReference(
  tokens: CompositionTokens,
  groupId: string,
  name: string,
): string | null {
  const property = tokens.groups[groupId]?.property
  return property ? `var(${property.split('{name}').join(name)})` : null
}
