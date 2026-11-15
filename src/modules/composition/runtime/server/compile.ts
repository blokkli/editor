import { parse, NodeTypes } from '@vue/compiler-dom'
import type {
  AttributeNode,
  DirectiveNode,
  ElementNode,
  TemplateChildNode,
} from '@vue/compiler-dom'
import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'
import type { AtRule, ChildNode, Rule } from 'postcss'
import { parse as parseScript, parseExpression } from '@babel/parser'
import type { Node as JsNode } from '@babel/types'
import { primitives, tokens } from '#blokkli-build/composition-definitions'
import { compositionChildren } from '#blokkli-build/composition-children'
import type {
  CompiledComposition,
  CompositionChildReference,
  CompositionError,
  CompositionImagePlacement,
  CompositionImageStyle,
  CompositionPrimitive,
  CompositionProp,
  CompositionRenderNode,
  CompositionResponsiveValue,
  CompositionTokens,
} from '../types'
import { getTokenProperties } from '../helpers'
import {
  ALLOWED_AT_RULES,
  ALLOWED_ELEMENTS,
  CHILD_ELEMENTS,
  FORBIDDEN_FUNCTIONS,
  FORBIDDEN_SELECTORS,
  GLOBAL_ATTRIBUTES,
  INLINE_ELEMENTS,
  attributeToProp,
  primitiveIdToTag,
  propToAttribute,
  sanitizeUrl,
  tagToPrimitiveId,
} from '../helpers/markup'

/** Longer sources are refused: the route takes any input. */
const MAX_SOURCE_LENGTH = 200_000

const ID_PATTERN = /^[a-z][\w-]*$/i
const CLASS_PATTERN = /^-?[_a-z][\w-]*$/i

/** FNV-1a: a short, stable hash of the source, for the scope attribute. */
function hash(value: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

function isElement(node: TemplateChildNode): node is ElementNode {
  return node.type === NodeTypes.ELEMENT
}

function isDirective(
  prop: AttributeNode | DirectiveNode,
): prop is DirectiveNode {
  return prop.type === NodeTypes.DIRECTIVE
}

/** A JavaScript literal the source may not have, with where it is. */
class LiteralError extends Error {
  constructor(
    message: string,
    public node: JsNode,
  ) {
    super(message)
  }
}

const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * The value of a literal: objects, arrays, strings, numbers, booleans, null,
 * and the names of constants. Nothing is evaluated.
 */
function literalValue(node: JsNode, constants: Map<string, unknown>): unknown {
  switch (node.type) {
    case 'StringLiteral':
    case 'NumericLiteral':
    case 'BooleanLiteral':
      return node.value
    case 'NullLiteral':
      return null
    case 'TemplateLiteral':
      if (node.expressions.length) {
        throw new LiteralError('No ${} in strings: only literal values.', node)
      }
      return node.quasis.map((q) => q.value.cooked ?? '').join('')
    case 'UnaryExpression':
      if (node.operator === '-' && node.argument.type === 'NumericLiteral') {
        return -node.argument.value
      }
      break
    case 'ArrayExpression':
      return node.elements.map((element) => {
        if (!element || element.type === 'SpreadElement') {
          throw new LiteralError('No holes or spreads in arrays.', node)
        }
        return literalValue(element, constants)
      })
    case 'ObjectExpression': {
      const result: Record<string, unknown> = {}
      for (const property of node.properties) {
        if (property.type !== 'ObjectProperty' || property.computed) {
          throw new LiteralError(
            'Only plain properties (`key: value`) in objects.',
            property,
          )
        }
        const key =
          property.key.type === 'Identifier'
            ? property.key.name
            : property.key.type === 'StringLiteral'
              ? property.key.value
              : property.key.type === 'NumericLiteral'
                ? String(property.key.value)
                : null
        if (key === null || RESERVED_KEYS.has(key)) {
          throw new LiteralError('Not a valid key.', property.key)
        }
        result[key] = literalValue(property.value, constants)
      }
      return result
    }
    case 'Identifier':
      if (constants.has(node.name)) {
        return structuredClone(constants.get(node.name))
      }
      throw new LiteralError(
        `"${node.name}" isn't defined: declare it in <script setup> (const ${node.name} = …).`,
        node,
      )
  }
  throw new LiteralError(
    'Only literal values: objects, arrays, strings, numbers, booleans and constants. Nothing runs in a composition.',
    node,
  )
}

/** `48rem` or `768px` in CSS pixels (16 to the rem). */
function toPx(value: string | undefined): number {
  const match = /^(\d+(?:\.\d+)?)(rem|px)?$/.exec((value ?? '').trim())
  if (!match) return 0
  return Number(match[1]) * (match[2] === 'px' ? 1 : 16)
}

/** The value at a breakpoint: the last one set at or below it. */
function resolveAt<T>(
  value: CompositionResponsiveValue<T> | undefined,
  breakpoints: string[],
): T | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'object') return value
  const responsive = value as Record<string, T | undefined>
  let result = responsive.base
  for (const id of breakpoints) {
    if (responsive[id] !== undefined) result = responsive[id]
  }
  return result
}

function parseRatio(value: string | undefined): number | undefined {
  const match = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/.exec(
    value ?? '',
  )
  if (!match) return undefined
  const ratio = Number(match[1]) / Number(match[2])
  return Number.isFinite(ratio) && ratio > 0 ? ratio : undefined
}

function round(value: number, digits = 2): number {
  const f = 10 ** digits
  return Math.round(value * f) / f
}

/**
 * Where an image is shown, in window widths: the composition's breakpoints are
 * container queries, `sizes` and image styles only know the window. The
 * project's layout says how wide the composition is for a window width.
 */
export function computePlacement(
  style: CompositionImageStyle,
  definition: CompositionTokens,
): CompositionImagePlacement {
  const layout = definition.layout ?? {
    maxWidth: 1920,
    inset: [{ from: 0, inset: 0 }],
  }
  const insets = [...layout.inset].sort((a, b) => a.from - b.from)
  if (!insets.length || insets[0]!.from > 0)
    insets.unshift({ from: 0, inset: 0 })
  const insetAt = (w: number) =>
    insets.filter((i) => i.from <= w).at(-1)?.inset ?? 0

  const breakpoints = Object.entries(definition.breakpoints)
    .map(([id, b]) => ({ id, min: toPx(b.minWidth) }))
    .filter((b) => b.min > 0)
    .sort((a, b) => a.min - b.min)

  // The window widths where something changes: the inset, a breakpoint of the
  // composition, the composition's largest width.
  const points = new Set<number>([0])
  insets.forEach((entry, i) => {
    const next = insets[i + 1]?.from ?? Infinity
    points.add(entry.from)
    for (const w of [
      ...breakpoints.map((b) => b.min + entry.inset),
      layout.maxWidth + entry.inset,
    ]) {
      if (w >= entry.from && w < next) points.add(w)
    }
  })
  const starts = [...points].sort((a, b) => a - b)

  type Range = { from: number; size: string; width: number; ratio?: number }
  const ranges: Range[] = []
  starts.forEach((from, i) => {
    const to = starts[i + 1] ?? Infinity
    const inset = insetAt(from)
    const width = Math.min(from - inset, layout.maxWidth)
    const active = breakpoints.filter((b) => b.min <= width).map((b) => b.id)
    const percent = Number.parseFloat(resolveAt(style.width, active) ?? '100')
    const share = Math.min(Math.max(percent, 0), 100) / 100
    const ratio = parseRatio(resolveAt(style.ratio, active))
    const capped = from - inset >= layout.maxWidth
    const size = capped
      ? `${Math.ceil(share * layout.maxWidth)}px`
      : inset
        ? `calc(${round(share * 100)}vw - ${Math.round(share * inset)}px)`
        : `${round(share * 100)}vw`
    const largest = Math.min(to - inset, layout.maxWidth)
    const range: Range = {
      from,
      size,
      width: Math.ceil(
        share * (Number.isFinite(largest) ? largest : layout.maxWidth),
      ),
      ratio,
    }
    const previous = ranges.at(-1)
    if (
      previous &&
      previous.size === range.size &&
      previous.ratio === range.ratio
    ) {
      previous.width = Math.max(previous.width, range.width)
    } else {
      ranges.push(range)
    }
  })

  const sizes = [...ranges]
    .reverse()
    .map((r) => (r.from ? `(min-width: ${r.from}px) ${r.size}` : r.size))
    .join(', ')

  return {
    sizes,
    widths: ranges.map((r) => ({
      from: r.from,
      width: r.width,
      ...(r.ratio ? { ratio: round(r.ratio, 4) } : {}),
    })),
    maxWidth: Math.max(...ranges.map((r) => r.width)),
    cover: ranges.some((r) => r.ratio !== undefined),
    priority: style.priority === true,
  }
}

/**
 * Compiles a composition's source into what the browser may get: the tree of
 * accepted parts and the scoped, checked CSS. Everything that isn't accepted
 * is left out and reported in `errors`, so the result is safe to render
 * whatever the source holds. The agent's tools refuse a source with errors.
 */
export function compileComposition(input: string): CompiledComposition {
  const errors: CompositionError[] = []
  const source =
    input.length > MAX_SOURCE_LENGTH ? '' : input.replace(/\r\n?/g, '\n')
  if (input.length > MAX_SOURCE_LENGTH) {
    errors.push({
      message: `The source is too long: at most ${MAX_SOURCE_LENGTH} characters.`,
    })
  }

  const error = (message: string, node?: { loc: ElementNode['loc'] }) => {
    errors.push({
      message,
      line: node?.loc.start.line,
      column: node?.loc.start.column,
    })
  }

  const ast = parse(source, {
    comments: false,
    onError(e) {
      errors.push({
        message: e.message,
        line: e.loc?.start.line,
        column: e.loc?.start.column,
      })
    },
  })

  // The ids the source already has, so that new ones don't take them.
  const explicitIds = new Set<string>()
  const collectIds = (nodes: TemplateChildNode[]) => {
    for (const node of nodes) {
      if (!isElement(node)) continue
      for (const prop of node.props) {
        if (!isDirective(prop) && prop.name === 'id' && prop.value?.content) {
          explicitIds.add(prop.value.content)
        }
      }
      collectIds(node.children)
    }
  }
  collectIds(ast.children)

  const usedIds = new Set<string>()
  const counters: Record<string, number> = {}
  // Changes to the source: the new ids go in, the children's field values
  // come out.
  const edits: { start: number; end: number; text: string }[] = []
  // The constants of <script setup>.
  const constants = new Map<string, unknown>()
  const children: CompositionChildReference[] = []
  // Where each child's content goes, as an offset in the source before the
  // edits: mapped once they're done.
  const contentOffsets = new Map<CompositionChildReference, number>()
  // The children's ratios, for the CSS that crops them.
  const ratios: { id: string; ratio: CompositionResponsiveValue<string> }[] = []

  function newId(base: string): string {
    let id: string
    do {
      counters[base] = (counters[base] ?? 0) + 1
      id = `${base}-${counters[base]}`
    } while (explicitIds.has(id) || usedIds.has(id))
    return id
  }

  /** The element's id: its own, or a new one that goes into the source. */
  function resolveId(el: ElementNode, base: string): string {
    const attr = el.props.find(
      (p): p is AttributeNode => !isDirective(p) && p.name === 'id',
    )
    const value = attr?.value?.content
    if (value && ID_PATTERN.test(value) && !usedIds.has(value)) {
      usedIds.add(value)
      return value
    }
    if (value && !ID_PATTERN.test(value)) {
      error(
        `id "${value}": use letters, digits, - and _, starting with a letter.`,
        attr,
      )
    } else if (value) {
      error(`id "${value}" is used twice.`, attr)
    }
    const id = newId(base)
    usedIds.add(id)
    if (!attr) {
      const offset = el.loc.start.offset + 1 + el.tag.length
      edits.push({ start: offset, end: offset, text: ` id="${id}"` })
    }
    return id
  }

  function readClass(attr: AttributeNode): string | undefined {
    const classes = (attr.value?.content ?? '').split(/\s+/).filter(Boolean)
    const invalid = classes.filter((c) => !CLASS_PATTERN.test(c))
    if (invalid.length) {
      error(
        `class: ${invalid.map((c) => `"${c}"`).join(', ')} isn't a valid class name.`,
        attr,
      )
    }
    const valid = classes.filter((c) => CLASS_PATTERN.test(c))
    return valid.length ? valid.join(' ') : undefined
  }

  /** An error at a place in a JavaScript snippet of the source. */
  function jsError(
    message: string,
    start: { line: number; column: number },
    loc?: { line: number; column: number } | null,
  ) {
    errors.push({
      message,
      line: start.line + (loc ? loc.line - 1 : 0),
      column: loc
        ? loc.line === 1
          ? start.column + loc.column
          : loc.column + 1
        : start.column,
    })
  }

  /** The value of a binding (`:name="…"`): literals and constants only. */
  function bindingValue(attr: DirectiveNode, tag: string): unknown {
    const exp = attr.exp
    const code = exp && 'content' in exp ? exp.content : ''
    const start = exp?.loc.start ?? attr.loc.start
    if (!code.trim()) {
      error(`<${tag}> ${attr.rawName}: the binding has no value.`, attr)
      return undefined
    }
    try {
      return literalValue(parseExpression(code), constants)
    } catch (e) {
      if (e instanceof LiteralError) {
        jsError(
          `<${tag}> ${attr.rawName}: ${e.message}`,
          start,
          e.node.loc?.start,
        )
      } else {
        const err = e as {
          message?: string
          loc?: { line: number; column: number }
        }
        jsError(
          `<${tag}> ${attr.rawName}: ${(err.message ?? String(e)).replace(/ \(\d+:\d+\)$/, '')}`,
          start,
          err.loc,
        )
      }
      return undefined
    }
  }

  /** A value per breakpoint, checked: `{ base, md, … }` or one value. */
  function checkResponsive(
    value: unknown,
    path: string,
    check: (v: unknown) => boolean,
    expected: string,
    attr: DirectiveNode,
  ): CompositionResponsiveValue<string> | undefined {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const result: Record<string, string> = {}
      for (const [key, v] of Object.entries(value)) {
        if (key !== 'base' && !tokens.breakpoints[key]) {
          error(
            `${path}.${key}: unknown breakpoint. Available: base, ${Object.keys(tokens.breakpoints).join(', ')}.`,
            attr,
          )
          continue
        }
        if (!check(v)) {
          error(`${path}.${key}: expected ${expected}.`, attr)
          continue
        }
        result[key] = v as string
      }
      return result
    }
    if (!check(value)) {
      error(
        `${path}: expected ${expected}, or one per breakpoint ({ base: …, md: … }).`,
        attr,
      )
      return undefined
    }
    return value as string
  }

  /** `:image-style`: how an image is shown. */
  function checkImageStyle(
    value: unknown,
    attr: DirectiveNode,
  ): CompositionImageStyle | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      error(
        "image-style: expected an object, e.g. { width: { base: '100%', md: '50%' }, ratio: '4/3' }.",
        attr,
      )
      return undefined
    }
    const style: CompositionImageStyle = {}
    for (const [key, v] of Object.entries(value)) {
      if (key === 'width') {
        style.width = checkResponsive(
          v,
          'image-style.width',
          (x) =>
            typeof x === 'string' &&
            /^\d+(?:\.\d+)?%$/.test(x) &&
            Number.parseFloat(x) > 0 &&
            Number.parseFloat(x) <= 100,
          "a percentage of the composition's width, e.g. '50%'",
          attr,
        )
      } else if (key === 'ratio') {
        style.ratio = checkResponsive(
          v,
          'image-style.ratio',
          (x) => typeof x === 'string' && parseRatio(x) !== undefined,
          "width over height, e.g. '4/3'",
          attr,
        )
      } else if (key === 'priority') {
        if (typeof v !== 'boolean') {
          error('image-style.priority: expected true or false.', attr)
        } else {
          style.priority = v
        }
      } else {
        error(
          `image-style.${key}: unknown. Available: width, ratio, priority.`,
          attr,
        )
      }
    }
    return style
  }

  /**
   * The HTML a child's text holds: text and the allowed elements, without
   * classes or ids (the text field keeps none). True if it holds elements.
   */
  function checkContent(nodes: TemplateChildNode[], tag: string): boolean {
    let hasElements = false
    for (const node of nodes) {
      if (node.type === NodeTypes.INTERPOLATION) {
        error("{{ }} isn't supported yet: write the text itself.", node)
        continue
      }
      if (!isElement(node)) continue
      hasElements = true
      const allowedAttrs = [
        ...GLOBAL_ATTRIBUTES,
        ...(ALLOWED_ELEMENTS[node.tag] ?? []),
      ]
      if (!ALLOWED_ELEMENTS[node.tag]) {
        error(
          `<${node.tag}> can't be part of the text in <${tag}>. HTML elements: ${Object.keys(ALLOWED_ELEMENTS).join(', ')}.`,
          node,
        )
        continue
      }
      for (const attr of node.props) {
        if (isDirective(attr)) {
          error(
            `<${node.tag}> ${attr.rawName ?? attr.name}: a text takes no bindings.`,
            attr,
          )
          continue
        }
        const name = attr.name.toLowerCase()
        const value = attr.value?.content ?? ''
        if (name === 'href') {
          if (!sanitizeUrl(value)) {
            error(
              `<${node.tag}> href="${value}": only http(s), mailto, tel and links within the site.`,
              attr,
            )
          }
          continue
        }
        if (!allowedAttrs.includes(name)) {
          error(
            `<${node.tag}> in <${tag}> doesn't take "${attr.name}"${name === 'class' || name === 'id' ? ': the text keeps no classes or ids, style the tag around it' : `. Allowed: ${allowedAttrs.join(', ') || 'none'}`}.`,
            attr,
          )
        }
      }
      checkContent(node.children, tag)
    }
    return hasElements
  }

  /**
   * A child: a paragraph of the composition's field, placed here. Its other
   * attributes are field values, and what's between its tags is the value of
   * its text field: both leave the source, the tool sets them on the child.
   */
  function convertChild(
    el: ElementNode,
    bundle: string,
  ): CompositionRenderNode {
    const tag = el.tag
    const id = resolveId(el, bundle.replace(/_/g, '-'))
    const fields: Record<string, string> = {}
    let cls: string | undefined
    let as: string | undefined
    let placement: CompositionImagePlacement | undefined

    for (const attr of el.props) {
      if (isDirective(attr)) {
        const arg =
          attr.arg && 'content' in attr.arg ? attr.arg.content : undefined
        if (attr.name !== 'bind' || arg !== 'image-style') {
          error(
            `<${tag}> ${attr.rawName ?? attr.name}: only :image-style takes a binding.`,
            attr,
          )
          continue
        }
        const style = checkImageStyle(bindingValue(attr, tag), attr)
        if (style) {
          placement = computePlacement(style, tokens)
          if (style.ratio) ratios.push({ id, ratio: style.ratio })
        }
        continue
      }
      if (attr.name === 'id') continue
      if (attr.name === 'class') {
        cls = readClass(attr)
        continue
      }
      if (attr.name === 'as') {
        const value = attr.value?.content ?? ''
        if (CHILD_ELEMENTS.has(value)) {
          as = value
        } else {
          error(
            `<${tag}> as="${value}": one of ${[...CHILD_ELEMENTS].join(', ')}.`,
            attr,
          )
        }
        continue
      }
      if (attr.name.includes(':')) {
        error(
          `<${tag}> ${attr.name}: a field has one value, not one per breakpoint.`,
          attr,
        )
        continue
      }
      fields[attr.name] = attr.value?.content ?? ''
      // The attribute and the whitespace before it.
      let start = attr.loc.start.offset
      while (start > 0 && /\s/.test(source[start - 1]!)) start--
      edits.push({ start, end: attr.loc.end.offset, text: '' })
    }

    // The content leaves the source. A tag without one gets a closing tag, so
    // that its text has a place when the tool puts it back.
    let content: CompositionChildReference['content'] = null
    let contentAt: number
    if (el.isSelfClosing) {
      let start = el.loc.end.offset - 2
      while (start > 0 && /\s/.test(source[start - 1]!)) start--
      edits.push({ start, end: el.loc.end.offset, text: `></${tag}>` })
      contentAt = start
    } else {
      const innerEnd = el.loc.end.offset - (tag.length + 3)
      const innerStart = el.children[0]?.loc.start.offset ?? innerEnd
      const html = source.slice(innerStart, innerEnd).trim()
      if (html && !compositionChildren[bundle]?.textField) {
        error(`<${tag}> takes no content: its fields are attributes.`, el)
      } else if (html) {
        const hasElements = checkContent(el.children, tag)
        content = {
          html,
          text: hasElements
            ? null
            : el.children
                .map((c) => (c.type === NodeTypes.TEXT ? c.content : ''))
                .join('')
                .replace(/\s+/g, ' ')
                .trim(),
        }
      }
      edits.push({ start: innerStart, end: innerEnd, text: '' })
      contentAt = innerStart
    }

    const reference: CompositionChildReference = {
      id,
      bundle,
      fields,
      content,
      contentAt: 0,
    }
    children.push(reference)
    contentOffsets.set(reference, contentAt)
    return {
      kind: 'child',
      id,
      bundle,
      class: cls,
      ...(as ? { as } : {}),
      loc: { start: el.loc.start.offset, end: el.loc.end.offset },
      ...(placement ? { placement } : {}),
    }
  }

  /** The constants of a `<script setup>` block: literals only. */
  function readScript(el: ElementNode) {
    if (!el.props.some((p) => !isDirective(p) && p.name === 'setup')) {
      error(
        "<script> isn't allowed: no code runs in a composition. <script setup> may declare constants (const name = { … }).",
        el,
      )
      return
    }
    const text = el.children[0]
    if (!text || text.type !== NodeTypes.TEXT) return
    const start = text.loc.start
    let program
    try {
      program = parseScript(text.content, { sourceType: 'module' }).program
    } catch (e) {
      const err = e as {
        message?: string
        loc?: { line: number; column: number }
      }
      jsError(
        `<script setup>: ${(err.message ?? String(e)).replace(/ \(\d+:\d+\)$/, '')}`,
        start,
        err.loc,
      )
      return
    }
    for (const statement of program.body) {
      if (
        statement.type !== 'VariableDeclaration' ||
        statement.kind !== 'const'
      ) {
        jsError(
          '<script setup> may only declare constants with literal values (const name = …). Nothing runs in a composition.',
          start,
          statement.loc?.start,
        )
        continue
      }
      for (const declaration of statement.declarations) {
        if (declaration.id.type !== 'Identifier' || !declaration.init) {
          jsError(
            '<script setup>: write const name = value.',
            start,
            declaration.loc?.start,
          )
          continue
        }
        try {
          constants.set(
            declaration.id.name,
            literalValue(declaration.init, constants),
          )
        } catch (e) {
          if (!(e instanceof LiteralError)) throw e
          jsError(`<script setup>: ${e.message}`, start, e.node.loc?.start)
        }
      }
    }
  }

  function checkPropValue(
    tag: string,
    name: string,
    prop: CompositionProp,
    attr: AttributeNode,
  ): unknown {
    const value = attr.value?.content
    if (prop.type === 'token' || prop.type === 'enum') {
      const allowed =
        prop.type === 'token'
          ? Object.keys(tokens.groups[prop.group]?.tokens ?? {})
          : Object.keys(prop.options)
      if (value === undefined || !allowed.includes(value)) {
        error(
          `<${tag}> ${name}="${value ?? ''}": not allowed. Allowed: ${allowed.join(', ')}.`,
          attr,
        )
        return undefined
      }
      return value
    }
    if (prop.type === 'boolean') {
      if (value === undefined || value === '' || value === 'true') return true
      if (value === 'false') return false
      error(`<${tag}> ${name}: write it without a value, or "false".`, attr)
      return undefined
    }
    if (prop.type === 'url') {
      const url = sanitizeUrl(value ?? '')
      if (!url) {
        error(
          `<${tag}> ${name}="${value ?? ''}": only http(s), mailto, tel and links within the site.`,
          attr,
        )
        return undefined
      }
      return url
    }
    return value ?? ''
  }

  /** The text of the children, or null if they hold more than text. */
  function textOf(children: TemplateChildNode[]): string | null {
    let text = ''
    for (const child of children) {
      if (child.type === NodeTypes.TEXT) {
        text += child.content
      } else {
        return null
      }
    }
    return text.trim()
  }

  function convertPrimitive(
    el: ElementNode,
    primitive: CompositionPrimitive,
  ): CompositionRenderNode {
    const tag = el.tag
    const id = resolveId(el, primitive.id)
    const props: Record<string, unknown> = {}
    const perBreakpoint: Record<string, Record<string, unknown>> = {}
    let cls: string | undefined

    for (const attr of el.props) {
      if (isDirective(attr)) {
        error(
          `<${tag}> ${attr.rawName ?? attr.name}: directives aren't supported yet.`,
          attr,
        )
        continue
      }
      if (attr.name === 'id') continue
      if (attr.name === 'class') {
        cls = readClass(attr)
        continue
      }
      const [breakpoint, attrName] = attr.name.includes(':')
        ? (attr.name.split(':', 2) as [string, string])
        : [null, attr.name]
      const key = attributeToProp(attrName)
      const prop = primitive.props[key]
      if (!prop) {
        const available = Object.keys(primitive.props)
          .filter((k) => primitive.props[k]!.type !== 'text')
          .map(propToAttribute)
        error(
          `<${tag}> has no attribute "${attr.name}". Available: ${available.join(', ') || 'none'}, class, id.`,
          attr,
        )
        continue
      }
      if (breakpoint) {
        if (!tokens.breakpoints[breakpoint]) {
          error(
            `<${tag}> ${attr.name}: unknown breakpoint "${breakpoint}". Available: ${Object.keys(tokens.breakpoints).join(', ')}.`,
            attr,
          )
          continue
        }
        if (!('responsive' in prop) || !prop.responsive) {
          error(`<${tag}> ${attrName} doesn't differ per breakpoint.`, attr)
          continue
        }
      }
      const value = checkPropValue(tag, attr.name, prop, attr)
      if (value === undefined) continue
      if (breakpoint) {
        ;(perBreakpoint[key] ??= {})[breakpoint] = value
      } else {
        props[key] = value
      }
    }
    for (const [key, values] of Object.entries(perBreakpoint)) {
      props[key] = {
        ...(props[key] !== undefined ? { base: props[key] } : {}),
        ...values,
      }
    }

    const slots: Record<string, CompositionRenderNode[]> = {}
    const slotEntries = Object.entries(primitive.slots ?? {})
    const textKey = Object.keys(primitive.props).find(
      (k) => primitive.props[k]!.type === 'text',
    )
    if (slotEntries.length) {
      const [slotName, slot] = slotEntries[0]!
      slots[slotName] = convertChildren(el.children, slot.allowed, tag)
    } else if (textKey) {
      const text = textOf(el.children)
      if (text === null) {
        error(
          `<${tag}> takes plain text only. For a text with links or bold, use HTML elements (<p>, <h2>, …).`,
          el,
        )
      } else if (text) {
        props[textKey] = text
      }
    } else if (
      el.children.some((c) => c.type !== NodeTypes.TEXT || c.content.trim())
    ) {
      error(`<${tag}> takes no content.`, el)
    }

    return {
      kind: 'primitive',
      id,
      type: primitive.id,
      props,
      class: cls,
      loc: { start: el.loc.start.offset, end: el.loc.end.offset },
      slots,
    }
  }

  function convertElement(el: ElementNode): CompositionRenderNode {
    const tag = el.tag
    const allowedAttrs = [
      ...GLOBAL_ATTRIBUTES,
      ...(ALLOWED_ELEMENTS[tag] ?? []),
    ]
    const id = INLINE_ELEMENTS.has(tag) ? undefined : resolveId(el, tag)
    const attrs: Record<string, string> = {}
    let cls: string | undefined

    for (const attr of el.props) {
      if (isDirective(attr)) {
        error(
          `<${tag}> ${attr.rawName ?? attr.name}: directives aren't supported yet.`,
          attr,
        )
        continue
      }
      const name = attr.name.toLowerCase()
      const value = attr.value?.content ?? ''
      if (name === 'id') {
        if (INLINE_ELEMENTS.has(tag)) {
          error(`<${tag}> is part of a text and takes no id.`, attr)
        }
        continue
      }
      if (name === 'class') {
        cls = readClass(attr)
        continue
      }
      if (!allowedAttrs.includes(name)) {
        error(
          `<${tag}> doesn't take "${attr.name}". Allowed: ${allowedAttrs.join(', ')}, class${INLINE_ELEMENTS.has(tag) ? '' : ', id'}.`,
          attr,
        )
        continue
      }
      if (name === 'href') {
        const url = sanitizeUrl(value)
        if (!url) {
          error(
            `<${tag}> href="${value}": only http(s), mailto, tel and links within the site.`,
            attr,
          )
          continue
        }
        attrs.href = url
        continue
      }
      if (name === 'target') {
        if (value !== '_blank') {
          error(`<${tag}> target: only "_blank".`, attr)
          continue
        }
        attrs.target = '_blank'
        attrs.rel = 'noopener noreferrer'
        continue
      }
      attrs[name] = value
    }

    return {
      kind: 'element',
      id,
      tag,
      attrs,
      class: cls,
      loc: { start: el.loc.start.offset, end: el.loc.end.offset },
      children:
        tag === 'br' || tag === 'hr' ? [] : convertChildren(el.children),
    }
  }

  /** The tags of the paragraph types that hold a text. */
  function textTags(): string {
    return (
      Object.values(compositionChildren)
        .filter((child) => child.textField)
        .map((child) => `<${child.tag}>`)
        .join(', ') || 'none'
    )
  }

  /**
   * Text outside a paragraph's tag: it would stay in the source, which isn't
   * translated.
   */
  function looseText(node: TemplateChildNode & { content: string }) {
    const text = node.content.trim().replace(/\s+/g, ' ')
    error(
      `Text goes between the tags of a paragraph that holds text (${textTags()}): "${text.length > 40 ? text.slice(0, 40) + '…' : text}".`,
      node,
    )
  }

  function convertChildren(
    children: TemplateChildNode[],
    allowedPrimitives?: string[],
    parentTag?: string,
  ): CompositionRenderNode[] {
    const result: CompositionRenderNode[] = []
    for (const child of children) {
      if (child.type === NodeTypes.TEXT) {
        if (child.content.trim()) {
          looseText(child)
        } else if (child.content) {
          result.push({ kind: 'text', text: child.content })
        }
        continue
      }
      if (child.type === NodeTypes.INTERPOLATION) {
        error("{{ }} isn't supported yet: write the text itself.", child)
        continue
      }
      if (!isElement(child)) continue
      const converted = convertTag(child, allowedPrimitives, parentTag)
      if (converted) result.push(converted)
    }
    return result
  }

  function convertTag(
    el: ElementNode,
    allowedPrimitives?: string[],
    parentTag?: string,
  ): CompositionRenderNode | null {
    const tag = el.tag
    const childBundle = Object.entries(compositionChildren).find(
      ([, child]) => child.tag === tag,
    )?.[0]
    if (childBundle) {
      return convertChild(el, childBundle)
    }
    const primitiveId = tagToPrimitiveId(tag)
    if (primitiveId) {
      const primitive = primitives[primitiveId]
      if (!primitive) {
        error(
          `Unknown component <${tag}>. Available: ${Object.keys(primitives)
            .map((p) => `<${primitiveIdToTag(p)}>`)
            .join(', ')}.`,
          el,
        )
        return null
      }
      if (allowedPrimitives && !allowedPrimitives.includes(primitiveId)) {
        error(
          `<${tag}> isn't allowed in <${parentTag}>. Allowed: ${allowedPrimitives.map((p) => `<${primitiveIdToTag(p)}>`).join(', ')}, and HTML elements.`,
          el,
        )
        return null
      }
      return convertPrimitive(el, primitive)
    }
    if (tag === 'style') {
      error('<style> belongs at the top level, after the markup.', el)
      return null
    }
    if (tag === 'script') {
      error('<script setup> belongs at the top level.', el)
      return null
    }
    if (!ALLOWED_ELEMENTS[tag]) {
      error(
        `<${tag}> isn't allowed. HTML elements: ${Object.keys(ALLOWED_ELEMENTS).join(', ')}. Components: ${Object.keys(
          primitives,
        )
          .map((p) => `<${primitiveIdToTag(p)}>`)
          .join(', ')}.`,
        el,
      )
      return null
    }
    return convertElement(el)
  }

  // The constants first: the markup uses them.
  for (const child of ast.children) {
    if (isElement(child) && child.tag === 'script') readScript(child)
  }

  // The top level: the markup, and the <style> blocks.
  const tree: CompositionRenderNode[] = []
  const styles: { css: string; line: number }[] = []
  for (const child of ast.children) {
    if (isElement(child) && child.tag === 'script') continue
    if (isElement(child) && child.tag === 'style') {
      const text = child.children[0]
      if (text && text.type === NodeTypes.TEXT) {
        styles.push({ css: text.content, line: text.loc.start.line })
      }
      continue
    }
    if (child.type === NodeTypes.TEXT) {
      if (child.content.trim()) looseText(child)
      continue
    }
    if (child.type === NodeTypes.INTERPOLATION) {
      error("{{ }} isn't supported yet: write the text itself.", child)
      continue
    }
    if (!isElement(child)) continue
    const converted = convertTag(child)
    if (converted) tree.push(converted)
  }

  // The source as it's stored: from the last change to the first, so that the
  // offsets stay right.
  let normalized = source
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    normalized =
      normalized.slice(0, edit.start) + edit.text + normalized.slice(edit.end)
  }

  // Where each child's content goes in the stored source.
  for (const [reference, offset] of contentOffsets) {
    let shift = 0
    for (const edit of edits) {
      if (
        edit.end <= offset &&
        !(edit.start === offset && edit.end === offset)
      ) {
        shift += edit.text.length - (edit.end - edit.start)
      }
    }
    // A closing tag added after the start tag: the content goes after its ">".
    const added = edits.find(
      (e) => e.start === offset && e.text.startsWith('></'),
    )
    reference.contentAt = offset + shift + (added ? 1 : 0)
  }

  const scope = 'data-v-c' + hash(normalized)
  const css = compileCss(styles, scope, errors, ratioRules(ratios, scope))

  return { source: normalized, children, tree, css, scope, errors }
}

/**
 * Scopes the CSS to the composition, as Vue's scoped styles do: the last
 * compound of every selector gets the scope attribute, before its
 * pseudo-classes, so that a selector only matches the composition's elements.
 * Keyframes get the scope in their name, and the animations that use them
 * follow.
 */
function scopeCss(css: string, scope: string): string {
  const suffix = scope.replace(/^data-v-/, '')
  const root = postcss.parse(css)
  const processor = selectorParser((selectors) => {
    selectors.each((selector) => {
      const nodes = selector.nodes
      let start = 0
      nodes.forEach((n, i) => {
        if (n.type === 'combinator') start = i + 1
      })
      let at = nodes.length
      for (let i = start; i < nodes.length; i++) {
        if (nodes[i]!.type === 'pseudo') {
          at = i
          break
        }
      }
      const attribute = selectorParser.attribute({
        attribute: scope,
        value: undefined,
        raws: {},
        quoteMark: null,
      })
      if (at < nodes.length) {
        selector.insertBefore(nodes[at]!, attribute)
      } else {
        selector.append(attribute)
      }
    })
  })

  const keyframes = new Set<string>()
  root.walkAtRules((rule) => {
    if (/keyframes$/i.test(rule.name)) {
      keyframes.add(rule.params.trim())
      rule.params = `${rule.params.trim()}-${suffix}`
    }
  })
  root.walkRules((rule) => {
    if (isInKeyframes(rule)) return
    rule.selector = processor.processSync(rule.selector)
  })
  if (keyframes.size) {
    root.walkDecls(/^(-webkit-)?animation(-name)?$/i, (decl) => {
      decl.value = decl.value.replace(/[\w-]+/g, (word) =>
        keyframes.has(word) ? `${word}-${suffix}` : word,
      )
    })
  }
  return root.toString()
}

/** Lowercase, without comments: what the browser reads. */
function normalizeValue(value: string): string {
  return value.replace(/\/\*[\s\S]*?\*\//g, '').toLowerCase()
}

function isInKeyframes(node: ChildNode): boolean {
  let parent = node.parent
  while (parent && parent.type !== 'root') {
    if (
      parent.type === 'atrule' &&
      /keyframes$/i.test((parent as AtRule).name)
    ) {
      return true
    }
    parent = parent.parent as ChildNode['parent']
  }
  return false
}

/**
 * Checks the CSS, scopes it to the composition, checks it again, and adds the
 * rules every composition has: containment, the tokens, reduced motion.
 */
/**
 * The children's crops: each child's box gets its ratio, per breakpoint. Our
 * own rules, from checked values, before the agent's: its CSS may change them.
 */
function ratioRules(
  ratios: { id: string; ratio: CompositionResponsiveValue<string> }[],
  scope: string,
): string {
  const rules: string[] = []
  for (const { id, ratio } of ratios) {
    const values: [string, string | undefined][] =
      typeof ratio === 'object' ? Object.entries(ratio) : [['base', ratio]]
    for (const [breakpoint, value] of values) {
      const parsed = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/.exec(
        value ?? '',
      )
      if (!parsed) continue
      const rule = `[data-bkc-child="${id}"][${scope}] { aspect-ratio: ${parsed[1]} / ${parsed[2]}; }`
      const minWidth = tokens.breakpoints[breakpoint]?.minWidth
      if (breakpoint === 'base') {
        rules.unshift(rule)
      } else if (minWidth) {
        rules.push(`@container (min-width: ${minWidth}) { ${rule} }`)
      }
    }
  }
  return rules.join('\n')
}

function compileCss(
  styles: { css: string; line: number }[],
  scope: string,
  errors: CompositionError[],
  generated = '',
): string {
  const checked: string[] = []
  for (const style of styles) {
    const at = (node: ChildNode) => ({
      line: style.line + (node.source?.start?.line ?? 1) - 1,
      column: node.source?.start?.column,
    })
    let root: postcss.Root
    try {
      root = postcss.parse(style.css)
    } catch (e) {
      const err = e as { reason?: string; line?: number; column?: number }
      errors.push({
        message: 'CSS: ' + (err.reason ?? String(e)),
        line: style.line + (err.line ?? 1) - 1,
        column: err.column,
      })
      continue
    }
    root.walk((node) => {
      if (node.type === 'atrule') {
        if (!ALLOWED_AT_RULES.includes(node.name.toLowerCase())) {
          errors.push({
            message: `CSS: @${node.name} isn't allowed. Allowed: ${ALLOWED_AT_RULES.map((r) => '@' + r).join(', ')}.`,
            ...at(node),
          })
          node.remove()
        }
        return
      }
      if (node.type === 'rule') {
        if (isInKeyframes(node)) return
        if (node.parent?.type === 'rule') {
          errors.push({
            message: `CSS: "${node.selector}": no nesting, write each rule on its own.`,
            ...at(node),
          })
          node.remove()
          return
        }
        const selector = node.selector
        const forbidden = FORBIDDEN_SELECTORS.find((s) =>
          selector.toLowerCase().includes(s),
        )
        let message: string | null = null
        if (selector.includes('\\')) {
          message = `CSS: "${selector}": no escapes in selectors.`
        } else if (forbidden) {
          message = `CSS: "${selector}": ${forbidden} isn't allowed, the CSS stays inside the composition.`
        } else if (/(?:^|[\s>+~,(])#|[a-z\])]#/i.test(selector)) {
          message = `CSS: "${selector}": ids aren't rendered, select by class.`
        }
        if (message) {
          errors.push({ message, ...at(node) })
          node.remove()
        }
        return
      }
      if (node.type === 'decl') {
        const value = normalizeValue(node.value)
        const prop = node.prop.toLowerCase()
        let message: string | null = null
        if (node.prop.includes('\\') || node.value.includes('\\')) {
          message = `CSS: ${node.prop}: no escapes.`
        } else if (prop === 'behavior' || prop === '-moz-binding') {
          message = `CSS: ${node.prop} isn't allowed.`
        } else if (
          prop === 'content' &&
          !['""', "''", 'none', 'normal'].includes(value.trim())
        ) {
          message = `CSS: content may only be "", none or normal. Text belongs in the markup, where it can be edited and translated.`
        } else {
          const fn = FORBIDDEN_FUNCTIONS.find((f) =>
            new RegExp(`(^|[^a-z0-9-])${f.replace(/-/g, '\\-')}\\(`).test(
              value,
            ),
          )
          if (fn) {
            message = `CSS: ${node.prop}: ${fn}() isn't allowed. Images come with the components that show them.`
          }
        }
        if (message) {
          errors.push({ message, ...at(node) })
          node.remove()
        }
      }
    })
    checked.push(root.toString())
  }

  let scoped = ''
  if (checked.length) {
    // The last check: every rule's selectors must carry the scope. Anything
    // that got past the first check without it is dropped.
    try {
      const root = postcss.parse(scopeCss(checked.join('\n'), scope))
      root.walkRules((rule: Rule) => {
        if (isInKeyframes(rule)) return
        if (!rule.selectors.every((s) => s.includes(`[${scope}]`))) {
          rule.remove()
        }
      })
      root.walkAtRules((rule) => {
        if (!ALLOWED_AT_RULES.includes(rule.name.toLowerCase())) {
          rule.remove()
        }
      })
      scoped = root.toString()
    } catch {
      scoped = ''
    }
  }

  const properties = getTokenProperties(tokens)
  return [
    `.bk-composition[${scope}] { contain: layout paint; container-type: inline-size;${properties.map((p) => ` ${p};`).join('')} }`,
    generated,
    scoped,
    `@media (prefers-reduced-motion: reduce) { [${scope}], [${scope}]::before, [${scope}]::after { animation: none !important; transition: none !important; } }`,
  ]
    .filter(Boolean)
    .join('\n')
}
