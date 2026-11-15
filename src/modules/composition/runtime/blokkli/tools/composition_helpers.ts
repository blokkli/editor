import type { McpToolContext } from '#blokkli/agent/app/types'
import type { BlokkliApp } from '#blokkli/editor/types/app'
import type {
  AddNewBlocksEventBlock,
  BlockFieldValue,
} from '#blokkli/editor/events'
import type { FieldListItem } from '#blokkli/types'
import { itemEntityType } from '#blokkli-build/config'
import { primitives, tokens } from '#blokkli-build/composition-definitions'
import { compositionChildren } from '#blokkli-build/composition-children'
import { getTokenReference, parseDocument } from '../../helpers'
import {
  ALLOWED_AT_RULES,
  ALLOWED_ELEMENTS,
  CHILD_ELEMENTS,
  CHILD_KEY_OPTION,
  GLOBAL_ATTRIBUTES,
  INLINE_ELEMENTS,
  primitiveIdToTag,
  propToAttribute,
} from '../../helpers/markup'
import { compileOnServer } from '../../composables/useCompiledComposition'
import type { CompiledComposition, CompositionDocument } from '../../types'
import type { UpdateCompositionEvent } from '../../helpers/adapterTypes'

/**
 * The first bundle of the given ones with a composition option.
 */
export function findCompositionBundle(
  ctx: McpToolContext,
  allowedBundles: string[],
): { bundle: string; key: string } | { error: string } {
  for (const bundle of allowedBundles) {
    const key = findOptionKey(ctx, bundle)
    if (key) return { bundle, key }
  }
  return {
    error: `No block type with a composition option is allowed in this field. Allowed: ${allowedBundles.join(', ') || 'none'}.`,
  }
}

function findOptionKey(ctx: McpToolContext, bundle: string) {
  const definition = ctx.app.definitions.getDefaultDefinition(bundle)
  return Object.entries(definition?.options ?? {}).find(
    ([, option]) =>
      option.type === 'json' &&
      'dataType' in option &&
      option.dataType === 'composition',
  )?.[0]
}

export function findCompositionOptionKey(
  ctx: McpToolContext,
  uuid: string,
): { key: string } | { error: string } {
  const item = ctx.app.state.getFieldListItem(uuid)
  if (!item) return { error: `Paragraph not found: ${uuid}` }
  const key = findOptionKey(ctx, item.bundle)
  if (!key) {
    return { error: `Paragraph ${uuid} (${item.bundle}) is not a composition.` }
  }
  return { key }
}

/** The source as it's stored: without the children's field values. */
function readStoredSource(app: BlokkliApp, uuid: string, key: string): string {
  return parseDocument(
    app.state.mutatedOptions[uuid]?.[key] ??
      app.state.getFieldListItem(uuid)?.options?.[key],
  ).source
}

export function toOptionValue(source: string): string {
  const document: CompositionDocument = { version: 2, source }
  return JSON.stringify(document)
}

/**
 * Compiles the source on the server. Any error refuses it, with every
 * problem listed.
 */
export async function compileOrError(
  source: string,
): Promise<{ compiled: CompiledComposition } | { error: string }> {
  if (!source.trim()) {
    return { error: 'The source is empty.' }
  }
  const compiled = await compileOnServer(source)
  if (compiled.errors.length) {
    return {
      error:
        'The composition was not saved. Fix all of these and try again:\n' +
        compiled.errors
          .map(
            (e) =>
              '- ' +
              (e.line
                ? `Line ${e.line}${e.column ? `, column ${e.column}` : ''}: `
                : '') +
              e.message,
          )
          .join('\n'),
    }
  }
  return { compiled }
}

/** A field of a child that the markup sets as an attribute. */
type ChildField = {
  /** `media` for `field_media`. */
  attribute: string
  name: string
  label: string
  kind: 'reference' | 'link'
  /** For a reference: the entity type it takes. */
  targetType?: string
}

/**
 * The fields of a paragraph type that its tag in a composition takes as
 * attributes: its references and links. Its other texts aren't offered: a
 * component for compositions may not show them (an image's caption). The text
 * it shows is its content (see getChildTextField).
 */
export function getChildFields(app: BlokkliApp, bundle: string): ChildField[] {
  const attribute = (name: string) =>
    name.replace(/^field_/, '').replace(/_/g, '-')
  return app.types.droppableFieldConfig
    .forEntityTypeAndBundle(itemEntityType, bundle)
    .filter((config) => !config.readOnly)
    .map(
      (config): ChildField => ({
        attribute: attribute(config.name),
        name: config.name,
        label: config.label,
        kind: config.type,
        targetType: config.allowed[0]?.type,
      }),
    )
}

/** A child's text: the field its component edits, between its tags. */
type ChildTextField = {
  name: string
  type: 'plain' | 'markup'
  maxLength: number
}

/**
 * The text field of a paragraph type in a composition: the one its component
 * for compositions edits.
 */
export function getChildTextField(
  app: BlokkliApp,
  bundle: string,
): ChildTextField | undefined {
  const name = compositionChildren[bundle]?.textField
  if (!name) return undefined
  const config = app.types.editableFieldConfig
    .forEntityTypeAndBundle(itemEntityType, bundle)
    .find((c) => c.name === name)
  const type = app.fieldValue.resolveFieldType(itemEntityType, bundle, name)
  if (!config || !type || config.readOnly) return undefined
  return { name, type, maxLength: config.maxLength }
}

/** The tag a text field's HTML starts with when it's a paragraph's. */
const BLOCK_START = /^<(?:p|h[1-6]|ul|ol|dl|blockquote|table|div)[\s>]/i

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
}

/**
 * The source as the agent reads it: the stored one, with each child's text
 * between its tags, in the current language.
 */
export async function readAgentSource(
  app: BlokkliApp,
  uuid: string,
  key: string,
): Promise<string> {
  const stored = readStoredSource(app, uuid, key)
  if (!stored.trim()) return stored
  const compiled = await compileOnServer(stored)
  const bundle = app.state.getFieldListItem(uuid)?.bundle ?? ''
  const current = getCurrentChildren(app, uuid, getChildFieldName(app, bundle))
  let source = compiled.source
  const refs = [...compiled.children].sort((a, b) => b.contentAt - a.contentAt)
  for (const ref of refs) {
    const field = getChildTextField(app, ref.bundle)
    const child = current.find(
      (item) =>
        item.bundle === ref.bundle &&
        item.options?.[CHILD_KEY_OPTION] === ref.id,
    )
    if (!field || !child) continue
    const value = app.fieldValue
      .readRawValue(
        itemEntityType,
        child.uuid,
        ref.bundle,
        field.name,
        field.type,
      )
      .trim()
    const content = field.type === 'plain' ? escapeText(value) : value
    source =
      source.slice(0, ref.contentAt) + content + source.slice(ref.contentAt)
  }
  return source
}

/** The field of a composition type that holds its children. */
export function getChildFieldName(
  app: BlokkliApp,
  bundle: string,
): string | undefined {
  return app.types.fieldConfig.forEntityTypeAndBundle(itemEntityType, bundle)[0]
    ?.name
}

/**
 * The children a composition has now, with their options as the edit state
 * has them: a paragraph's own only has what's published.
 */
export function getCurrentChildren(
  app: BlokkliApp,
  uuid: string,
  fieldName: string | undefined,
): FieldListItem[] {
  if (!fieldName) return []
  const list =
    app.state.mutatedFields.value.find(
      (field) => field.entityUuid === uuid && field.name === fieldName,
    )?.list ?? []
  return list.map((item) => ({
    ...item,
    options: {
      ...item.options,
      ...(app.state.mutatedOptions[item.uuid] ?? {}),
    },
  }))
}

/**
 * The children after the change: one for every child the source places, by
 * its key. A child the composition has keeps its UUID, a new one gets one; the
 * attributes of its tag become field values, and its content the value of its
 * text field. In a translation only the texts change.
 */
export function buildChildren(
  app: BlokkliApp,
  compiled: CompiledComposition,
  current: FieldListItem[],
  translating = false,
): { children: AddNewBlocksEventBlock[] } | { error: string } {
  const errors: string[] = []
  const children: AddNewBlocksEventBlock[] = []
  for (const ref of compiled.children) {
    const tag = compositionChildren[ref.bundle]?.tag ?? ref.bundle
    const fields = getChildFields(app, ref.bundle)
    const values: BlockFieldValue[] = []
    if (translating && Object.keys(ref.fields).length) {
      errors.push(
        `<${tag} id="${ref.id}">: in a translation only the texts change, not ${Object.keys(ref.fields).join(', ')}.`,
      )
    }
    const textField = getChildTextField(app, ref.bundle)
    if (textField) {
      const value = getTextValue(tag, ref, textField, errors)
      if (value !== undefined) {
        values.push({ fieldName: textField.name, fieldValue: value })
      }
    }
    for (const [attribute, value] of Object.entries(ref.fields)) {
      const field = fields.find((f) => f.attribute === attribute)
      if (!field) {
        errors.push(
          `<${tag} id="${ref.id}"> has no attribute "${attribute}". Available: ${fields.map((f) => f.attribute).join(', ') || 'none'}, id, class, :image-style.`,
        )
        continue
      }
      if (field.kind === 'reference') {
        if (!/^\d+$/.test(value) || !field.targetType) {
          errors.push(
            `<${tag} id="${ref.id}"> ${attribute}="${value}": the ID of a ${field.targetType ?? 'referenced'} item${field.targetType === 'media' ? ' (from search_media)' : ''}.`,
          )
          continue
        }
        values.push({
          fieldName: field.name,
          fieldValue: { entityType: field.targetType, entityId: value },
        })
      } else {
        values.push({ fieldName: field.name, fieldValue: value })
      }
    }
    const existing = current.find(
      (item) =>
        item.bundle === ref.bundle &&
        item.options?.[CHILD_KEY_OPTION] === ref.id,
    )
    if (translating && !existing) {
      errors.push(
        `<${tag} id="${ref.id}"> is new: in a translation the parts stay as they are, only their texts change.`,
      )
    }
    children.push({
      bundle: ref.bundle,
      blockUuid: existing?.uuid ?? crypto.randomUUID(),
      values,
      options: { [CHILD_KEY_OPTION]: ref.id },
    })
  }
  if (errors.length) {
    return {
      error:
        'The composition was not saved. Fix all of these and try again:\n' +
        errors.map((e) => '- ' + e).join('\n'),
    }
  }
  return { children }
}

/**
 * The value of a child's text field from what's between its tags: plain text
 * for a plain field, the field's HTML (block level) for a rich one.
 */
function getTextValue(
  tag: string,
  ref: CompiledComposition['children'][number],
  field: ChildTextField,
  errors: string[],
): string | undefined {
  if (!ref.content) {
    errors.push(
      `<${tag} id="${ref.id}"> needs its text between the tags: <${tag} id="${ref.id}">…</${tag}>.`,
    )
    return
  }
  if (field.type === 'plain') {
    if (ref.content.text === null) {
      errors.push(
        `<${tag} id="${ref.id}"> takes plain text, without HTML elements.`,
      )
      return
    }
    if (field.maxLength > 0 && ref.content.text.length > field.maxLength) {
      errors.push(
        `<${tag} id="${ref.id}">: at most ${field.maxLength} characters (it has ${ref.content.text.length}).`,
      )
      return
    }
    return ref.content.text
  }
  const html = ref.content.html
  return BLOCK_START.test(html) ? html : `<p>${html}</p>`
}

/**
 * A composition's new state, for `updateComposition`: the compiled source and
 * its children. In a translation, only the children's texts may change.
 */
export async function prepareCompositionUpdate(
  app: BlokkliApp,
  uuid: string,
  optionKey: string,
  source: string,
): Promise<
  | { event: UpdateCompositionEvent; compiled: CompiledComposition }
  | { error: string }
> {
  const result = await compileOrError(source)
  if ('error' in result) return result
  const translating = app.state.editMode.value === 'translating'
  if (translating) {
    const current = await compileOnServer(
      readStoredSource(app, uuid, optionKey),
    )
    if (current.source !== result.compiled.source) {
      return {
        error:
          'The composition was not saved: in a translation only the texts between the tags change. Keep the markup, the attributes and the CSS as they are.',
      }
    }
  }
  const bundle = app.state.getFieldListItem(uuid)?.bundle ?? ''
  const fieldName = getChildFieldName(app, bundle)
  if (result.compiled.children.length && !fieldName) {
    return {
      error: `This composition can't place paragraphs: its type (${bundle}) has no field for them.`,
    }
  }
  const built = buildChildren(
    app,
    result.compiled,
    getCurrentChildren(app, uuid, fieldName),
    translating,
  )
  if ('error' in built) return built
  return {
    compiled: result.compiled,
    event: {
      uuid,
      optionKey,
      value: toOptionValue(result.compiled.source),
      fieldName: fieldName ?? '',
      children: built.children,
    },
  }
}

function describeTokenGroup(groupId: string): string {
  return tokens.groups[groupId]?.label.toLowerCase() ?? groupId
}

/**
 * The style guide: the components, the HTML elements, the tokens as CSS, the
 * breakpoints and the rules of the CSS.
 */
export function getGuide(app: BlokkliApp): string {
  const lines: string[] = []

  lines.push('# Components')
  lines.push(
    'Use them for the parts the site has a standard for: they look like the rest of the site. Attributes in kebab-case. A component attribute marked "per breakpoint" takes a prefix: `md:gap="lg"` applies from the md breakpoint on.',
  )
  for (const primitive of Object.values(primitives)) {
    const tag = primitiveIdToTag(primitive.id)
    const attributes: string[] = []
    let content = 'no content'
    for (const [key, prop] of Object.entries(primitive.props)) {
      if (prop.type === 'text') {
        content = 'plain text'
        continue
      }
      const parts: string[] = []
      if (prop.description) parts.push(prop.description)
      if (prop.type === 'token') {
        parts.push(
          `Values (${describeTokenGroup(prop.group)} tokens): ${Object.keys(tokens.groups[prop.group]?.tokens ?? {}).join(', ')}.`,
        )
      } else if (prop.type === 'enum') {
        parts.push(
          'Values: ' +
            Object.entries(prop.options)
              .map(([v, o]) => (o.description ? `${v} (${o.description})` : v))
              .join(', ') +
            '.',
        )
      } else if (prop.type === 'boolean') {
        parts.push('A flag, without a value.')
      } else if (prop.type === 'url') {
        parts.push('A link.')
      }
      if ('responsive' in prop && prop.responsive) parts.push('Per breakpoint.')
      if (prop.default !== undefined) parts.push(`Default: ${prop.default}.`)
      attributes.push(`  - \`${propToAttribute(key)}\`: ${parts.join(' ')}`)
    }
    if (primitive.slots && Object.keys(primitive.slots).length) {
      content = 'other parts'
    }
    lines.push(`- \`<${tag}>\`: ${primitive.description} Content: ${content}.`)
    lines.push(...attributes)
  }

  const childBundles = Object.entries(compositionChildren)
  if (childBundles.length) {
    lines.push('')
    lines.push('# Paragraphs')
    lines.push(
      "The site's own paragraphs, placed in the markup: they look and work as everywhere on the site, editors edit them in place, and their texts are translated. Each tag needs an id that stays the same: it's how the paragraph is found again, with its translations. Moving or restyling the tag keeps the paragraph; removing the tag removes it. A field attribute sets the field; leave it out to keep what the paragraph has. Every text of the composition is in one of these tags: text anywhere else is refused.",
    )
    lines.push(
      `- A tag's root is the element it renders, with the tag's \`class\`: style it as that element. \`as\` sets the element, one of ${[...CHILD_ELEMENTS].map((t) => `\`${t}\``).join(', ')}.`,
    )
    for (const [bundle, child] of childBundles) {
      lines.push(`- \`<${child.tag}>\`: ${app.types.getBlockLabel(bundle)}.`)
      const textField = getChildTextField(app, bundle)
      if (textField?.type === 'plain') {
        lines.push(
          `  - Its text between the tags: plain text, no HTML elements${textField.maxLength > 0 ? `, at most ${textField.maxLength} characters` : ''}. \`<${child.tag} id="…" as="h2">…</${child.tag}>\`; without \`as\`, its own element.`,
        )
      } else if (textField) {
        lines.push(
          `  - Its text between the tags: the HTML of a rich text, in paragraphs: \`<${child.tag} id="…"><p>…</p></${child.tag}>\`. Paragraphs, h2 to h6, lists, links, \`<strong>\`, \`<em>\` and quotes, without classes or ids: the text's own styles apply inside, and the composition's CSS reaches it only through inherited properties (font, colour) on the tag.`,
        )
      } else {
        lines.push('  - No content between the tags.')
      }
      const fields = getChildFields(app, bundle)
      for (const field of fields) {
        const what =
          field.kind === 'link'
            ? 'A link.'
            : field.targetType === 'media'
              ? 'The ID of a media item, from search_media.'
              : `The ID of a ${field.targetType ?? 'referenced'} item.`
        lines.push(`  - \`${field.attribute}\`: ${field.label}. ${what}`)
      }
      if (!fields.some((field) => field.targetType === 'media')) continue
      lines.push(
        "  - `:image-style`: how its image is shown, a literal or a constant: `{ width, ratio, priority }`. `width`: its share of the composition's width, a percentage (`'50%'`), or one per breakpoint (`{ base: '100%', md: '50%' }`): the site loads the image in that size. `ratio`: width over height (`'4/3'`), or one per breakpoint: the box gets that ratio and the image covers it. `priority: true` for the first image of a page: loaded first. Set `width` to what your CSS gives the tag, or the image loads too small or too large.",
      )
    }
    lines.push('')
    lines.push('# Constants')
    lines.push(
      "A `<script setup>` block at the top may declare constants with literal values, for values used more than once: `const cardImage = { width: { base: '100%', md: '33%' }, ratio: '4/3' }`, then `:image-style=\"cardImage\"`. Only `const name = value` with objects, arrays, strings, numbers and booleans: nothing runs. Bindings (`:`) only on `:image-style`.",
    )
  }

  lines.push('')
  lines.push('# HTML elements')
  lines.push(
    `For everything else: ${Object.keys(ALLOWED_ELEMENTS)
      .map((t) => `<${t}>`)
      .join(' ')}.`,
  )
  lines.push(
    `- Every element takes \`class\` and ${GLOBAL_ATTRIBUTES.map((a) => `\`${a}\``).join(', ')}.`,
  )
  for (const [tag, attrs] of Object.entries(ALLOWED_ELEMENTS)) {
    if (attrs.length) {
      lines.push(
        `- \`<${tag}>\` also: ${attrs.map((a) => `\`${a}\``).join(', ')}`,
      )
    }
  }
  lines.push(
    '- `<a href>`: http(s), mailto, tel or a link within the site. `target` only `_blank`.',
  )
  lines.push(
    `- Text elements may hold inline elements (${[...INLINE_ELEMENTS].map((t) => `<${t}>`).join(' ')}).`,
  )
  lines.push(
    '- No `<img>` (images are the `<Image>` paragraph), scripts, forms, inline styles, `{{ }}` or directives (`@`, `v-`; `:` only on `:image-style`).',
  )

  lines.push('')
  lines.push('# Design tokens')
  lines.push(
    "The site's design system, as CSS custom properties. Use them for every colour, spacing and type size: raw values (#hex, 37px) drift from the site.",
  )
  for (const [groupId, group] of Object.entries(tokens.groups)) {
    lines.push(`## ${group.label}`)
    if (group.description) lines.push(group.description)
    for (const [name, token] of Object.entries(group.tokens)) {
      const ref = getTokenReference(tokens, groupId, name)
      if (!ref) continue
      const label =
        token.label && token.label !== name ? `${token.label}. ` : ''
      lines.push(`- \`${ref}\`: ${label}${token.description ?? ''}`.trimEnd())
    }
  }

  lines.push('')
  lines.push('# Breakpoints')
  lines.push(
    "They follow the composition's own width, not the window's: write container queries. Mobile first: the base styles are the phone, add rules from a breakpoint on.",
  )
  for (const [id, breakpoint] of Object.entries(tokens.breakpoints)) {
    const query = breakpoint.minWidth
      ? `\`@container (min-width: ${breakpoint.minWidth})\``
      : ''
    lines.push(
      `- \`${id}\` (${breakpoint.label}): ${query}${breakpoint.description ? ' ' + breakpoint.description : ''}`,
    )
  }

  lines.push('')
  lines.push('# CSS')
  lines.push(
    "- In `<style>` blocks after the markup. They're scoped: a selector only matches this composition's elements. Select by class; ids aren't rendered.",
  )
  lines.push(
    "- A component's inner elements can't be selected: give the component a class, and style its outer element.",
  )
  lines.push(
    `- At-rules: ${ALLOWED_AT_RULES.map((r) => '@' + r).join(', ')}. No @import, @font-face, @property, @layer.`,
  )
  lines.push(
    '- No url(), image-set(), attr(), no text in `content` (only `content: ""`), no escapes, no :global() or :deep().',
  )
  lines.push(
    '- `position: fixed` stays inside the composition. Animations and transitions are turned off for visitors who prefer reduced motion: the section must look complete without them.',
  )
  lines.push(
    "- Scroll-driven animations (`animation-timeline: view()`) are welcome; not every browser has them, so the end state must be the element's normal style.",
  )

  return lines.join('\n')
}
