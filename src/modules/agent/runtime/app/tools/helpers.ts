import type { OptionItem } from '#blokkli/editor/helpers/options'
import { getMutatedOptionValue } from '#blokkli/editor/helpers/options'
import { getRuntimeOptionValue } from '#blokkli/runtime-helpers'
import type { BlokkliApp } from '#blokkli/editor/types/app'
import type { BlockOptionsMap } from './schemas'

type ReadabilityIssue = {
  text: string
  impact?: string
  scores?: Record<string, number>
}

type ReadabilityFieldResult = {
  fieldValue?: string
  issues: ReadabilityIssue[]
}

export type ReadabilityResult = Record<
  string,
  Record<string, ReadabilityFieldResult>
>

/**
 * Resolve a target HTMLElement to its paragraph UUID and editable field name.
 */
export function resolveTargetInfo(target: HTMLElement): {
  paragraphUuid?: string
  fieldName?: string
} {
  const blockEl = target.closest('[data-bk-uuid]')
  const paragraphUuid = blockEl?.getAttribute('data-bk-uuid') ?? undefined

  // Walk up from target to find the editable field element.
  let fieldName: string | undefined
  let el: HTMLElement | null = target
  while (el) {
    if (el.dataset.blokkliEditableField) {
      fieldName = el.dataset.blokkliEditableField
      break
    }
    if (el === blockEl) break
    el = el.parentElement
  }

  return { paragraphUuid, fieldName }
}

/**
 * Run all readability analyzers against the page and return results grouped
 * by paragraph UUID and field name.
 */
export async function runReadabilityAnalysis(
  app: BlokkliApp,
  itemEntityType: string,
): Promise<ReadabilityResult> {
  const { analyze, ui } = app

  await analyze.ensureInitialized()

  const readabilityAnalyzers = analyze.analyzers.value.filter(
    (a) => a.type === 'readability' && !a.requireRawPage,
  )

  if (readabilityAnalyzers.length === 0) {
    return {}
  }

  const analyzerCtx = analyze.createContext(ui.providerElement)
  const result: ReadabilityResult = {}

  for (const analyzer of readabilityAnalyzers) {
    const rawResults = await analyze.runAnalyzer(analyzer, analyzerCtx)

    for (const r of rawResults) {
      const rawNodes = Array.isArray(r.nodes) ? r.nodes : [r.nodes]

      for (const node of rawNodes) {
        const targets = Array.isArray(node.targets)
          ? node.targets
          : [node.targets]

        for (const target of targets) {
          if (!(target instanceof HTMLElement)) continue

          const info = resolveTargetInfo(target)
          if (!info.paragraphUuid || !info.fieldName) continue

          const uuid = info.paragraphUuid
          const field = info.fieldName
          const block = app.blocks.getBlock(uuid)
          if (!block) continue

          const fieldType = getFieldType(
            app,
            itemEntityType,
            block.bundle,
            field,
          )
          if (!fieldType) continue

          const isMarkup = fieldType === 'markup'
          const targetText = isMarkup
            ? target.innerHTML?.trim()
            : target.textContent?.trim()
          if (!targetText) continue

          if (!result[uuid]) {
            result[uuid] = {}
          }
          if (!result[uuid][field]) {
            const fieldValue = getEditableValue(
              app,
              itemEntityType,
              uuid,
              block.bundle,
              field,
              fieldType,
            )
            result[uuid][field] = {
              fieldValue: fieldValue || undefined,
              issues: [],
            }
          }

          result[uuid][field].issues.push({
            text: targetText,
            impact: node.impact,
            scores: node.scores,
          })

          break
        }
      }
    }
  }

  return result
}

/**
 * Extract a simple key→label map from the various radios/checkboxes option formats.
 * Handles plain strings, icon objects, color objects, grid objects, etc.
 */
export function extractOptionLabels(
  option: Record<string, unknown>,
): Record<string, string> | undefined {
  if (!('options' in option) || !option.options) return undefined

  const raw = option.options as Record<string, unknown>
  const labels: Record<string, string> = {}

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      labels[key] = value
    } else if (
      typeof value === 'object' &&
      value !== null &&
      'label' in value
    ) {
      labels[key] = String((value as { label: string }).label)
    } else {
      labels[key] = key
    }
  }

  return labels
}

/**
 * Build a block options map from available options and mutated state.
 */
export function buildBlockOptionsMap(
  availableOptions: OptionItem[],
  mutatedOptions: Record<string, Record<string, string>>,
  uuid: string,
): BlockOptionsMap {
  const result: BlockOptionsMap = {}

  for (const opt of availableOptions) {
    const rawValue = getMutatedOptionValue(
      mutatedOptions,
      uuid,
      opt.property,
      opt.option.default,
    )
    const currentValue = getRuntimeOptionValue(opt.option, rawValue)

    result[opt.property] = buildBlockOptionEntry(opt.option, currentValue)
  }

  return result
}

/**
 * Build a block options map from option definitions, using defaults as current values.
 */
export function buildBlockOptionsMapFromDefinitions(
  options: Record<string, Record<string, unknown>>,
): BlockOptionsMap {
  const result: BlockOptionsMap = {}

  for (const [key, opt] of Object.entries(options)) {
    result[key] = buildBlockOptionEntry(
      opt,
      opt.default as string | boolean | number | string[],
    )
  }

  return result
}

/**
 * Build a single block option entry from an option definition and a current value.
 */
function buildBlockOptionEntry(
  opt: Record<string, unknown>,
  currentValue: string | boolean | number | string[],
): BlockOptionsMap[string] {
  const entry: BlockOptionsMap[string] = {
    type: opt.type as string,
    label: opt.label as string,
    currentValue,
  }

  if (opt.description) {
    entry.description = opt.description as string
  }

  const labels = extractOptionLabels(opt)
  if (labels) {
    entry.options = labels
  }

  if ('min' in opt) {
    entry.min = opt.min as number | string
  }

  if ('max' in opt) {
    entry.max = opt.max as number | string
  }

  if ('step' in opt && opt.type === 'range') {
    entry.step = opt.step as number
  }

  return entry
}

/**
 * Validate a single option value against its definition.
 * Returns an error string or undefined if valid.
 */
export function validateOptionValue(
  key: string,
  value: string | boolean | number | string[],
  optionDef: OptionItem,
): string | undefined {
  const optionType = optionDef.option.type

  if (optionType === 'checkbox') {
    if (
      typeof value !== 'boolean' &&
      value !== '1' &&
      value !== '0' &&
      value !== 'true' &&
      value !== 'false'
    ) {
      return `Option "${key}" expects a boolean value`
    }
  } else if (optionType === 'radios') {
    if (typeof value !== 'string') {
      return `Option "${key}" expects a string value`
    }
    if ('options' in optionDef.option && optionDef.option.options) {
      const allowedKeys = Object.keys(optionDef.option.options)
      if (!allowedKeys.includes(value)) {
        return `Option "${key}" value must be one of: ${allowedKeys.join(', ')}`
      }
    }
  } else if (optionType === 'checkboxes') {
    if (!Array.isArray(value) && typeof value !== 'string') {
      return `Option "${key}" expects an array of strings or comma-separated string`
    }
    if ('options' in optionDef.option && optionDef.option.options) {
      const allowedKeys = Object.keys(optionDef.option.options)
      const values = Array.isArray(value) ? value : value.split(',')
      for (const v of values) {
        if (!allowedKeys.includes(v)) {
          return `Option "${key}" value "${v}" is not allowed. Must be one of: ${allowedKeys.join(', ')}`
        }
      }
    }
  } else if (optionType === 'number' || optionType === 'range') {
    const numValue =
      typeof value === 'number' ? value : Number.parseFloat(String(value))
    if (Number.isNaN(numValue)) {
      return `Option "${key}" expects a numeric value`
    }
    if ('min' in optionDef.option && numValue < optionDef.option.min) {
      return `Option "${key}" value must be >= ${optionDef.option.min}`
    }
    if ('max' in optionDef.option && numValue > optionDef.option.max) {
      return `Option "${key}" value must be <= ${optionDef.option.max}`
    }
  }

  return undefined
}

/**
 * Resolve an editable field config to its simplified type.
 * Returns 'plain' for text fields, 'markup' for rich text/frame fields, null for unsupported.
 */
export function getFieldType(
  app: BlokkliApp,
  entityType: string,
  bundle: string,
  fieldName: string,
): 'plain' | 'markup' | null {
  const config = app.types.editableFieldConfig.forName(
    entityType,
    bundle,
    fieldName,
  )
  if (!config) return null
  if (config.type === 'table') return null
  if (config.type === 'frame' || config.type === 'markup') return 'markup'
  return 'plain'
}

/**
 * Read the current value of an editable field on a block or entity.
 * Tries the registered getValue() callback first, falls back to DOM element reading.
 */
export function getEditableValue(
  app: BlokkliApp,
  entityType: string,
  uuid: string,
  bundle: string,
  fieldName: string,
  fieldType: 'plain' | 'markup',
): string {
  const editables = app.directive.getEditablesForBlock(uuid)
  const editable = editables.find((e) => e.fieldName === fieldName)

  if (editable?.getValue) {
    return editable.getValue()
  }

  const element = app.directive.findEditableElement(fieldName, {
    type: entityType,
    uuid,
    bundle,
  })
  if (element) {
    return fieldType === 'markup'
      ? element.innerHTML || ''
      : element.textContent || ''
  }

  return ''
}

/**
 * Get all child fields and their paragraphs for a given entity UUID.
 * Walks mutatedFields to find fields belonging to the entity.
 */
export function getParagraphChildren(
  app: BlokkliApp,
  uuid: string,
): { fieldName: string; paragraphs: { uuid: string; bundle: string }[] }[] {
  const result: {
    fieldName: string
    paragraphs: { uuid: string; bundle: string }[]
  }[] = []

  for (const field of app.state.mutatedFields.value) {
    if (field.entityUuid === uuid && field.list.length > 0) {
      result.push({
        fieldName: field.name,
        paragraphs: field.list.map((item) => ({
          uuid: item.uuid,
          bundle: item.bundle,
        })),
      })
    }
  }

  return result
}

/**
 * Apply completed search/replace operations to an original value.
 * For each operation, tries exact match first, then whitespace-normalized.
 * When `selector` is true, uses CSS selector matching on parsed HTML.
 */
export function applyOperations(
  originalValue: string,
  operations: Array<{ search: string; replace: string; selector?: boolean }>,
): string {
  let result = originalValue
  for (const op of operations) {
    if (op.selector) {
      result = applySelectorOperation(result, op.search, op.replace)
      continue
    }

    // Try exact match.
    const exactIndex = result.indexOf(op.search)
    if (exactIndex !== -1) {
      result =
        result.slice(0, exactIndex) +
        op.replace +
        result.slice(exactIndex + op.search.length)
      continue
    }

    // Try whitespace-normalized matching.
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()
    const normalizedSearch = normalize(op.search)
    const normalizedResult = normalize(result)
    const normalizedIndex = normalizedResult.indexOf(normalizedSearch)
    if (normalizedIndex !== -1) {
      // Find the actual range in the original string by mapping
      // through whitespace-collapsed positions.
      let origStart = -1
      let origEnd = -1
      let normPos = 0
      let i = 0

      // Skip leading whitespace in result.
      while (i < result.length && /\s/.test(result[i]!)) i++

      while (
        i < result.length &&
        normPos <= normalizedIndex + normalizedSearch.length
      ) {
        if (normPos === normalizedIndex) origStart = i
        if (normPos === normalizedIndex + normalizedSearch.length) {
          origEnd = i
          break
        }
        if (/\s/.test(result[i]!)) {
          // Consume all whitespace in original, counts as one space in normalized.
          while (i < result.length && /\s/.test(result[i]!)) i++
          normPos++
        } else {
          i++
          normPos++
        }
      }
      if (
        origEnd === -1 &&
        normPos === normalizedIndex + normalizedSearch.length
      ) {
        origEnd = i
      }
      if (origStart !== -1 && origEnd !== -1) {
        result = result.slice(0, origStart) + op.replace + result.slice(origEnd)
      }
      // If normalization also fails, skip silently.
    }
    // No match — skip silently.
  }
  return result
}

/**
 * Apply a CSS-selector-based replacement on an HTML string.
 * Parses the HTML, finds the element matching `selector`, replaces its innerHTML,
 * and serializes back.
 */
export function applySelectorOperation(
  html: string,
  selector: string,
  replacement: string,
): string {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html')
    const el = doc.querySelector(selector)
    if (el) {
      el.innerHTML = replacement
      return doc.body.innerHTML
    }
  } catch {
    // If parsing or selection fails, return unchanged.
  }
  return html
}

/**
 * Resolve a `position` string to the `afterUuid` value expected by adapter methods.
 *
 * Returns `{ afterUuid: string | null }` on success, or `{ error: string }` if
 * the referenced UUID is not found in the target field.
 */
export function resolvePosition(
  app: BlokkliApp,
  parentUuid: string,
  fieldName: string,
  position?: string,
): { afterUuid: string | null } | { error: string } {
  const fieldList = app.state.mutatedFields.value.find(
    (f) => f.entityUuid === parentUuid && f.name === fieldName,
  )
  const list = fieldList?.list ?? []

  // Default or explicit "end": append after last block
  if (position === undefined || position === 'end') {
    const lastBlock = list.at(-1)
    return { afterUuid: lastBlock?.uuid ?? null }
  }

  // "start": insert at beginning
  if (position === 'start') {
    return { afterUuid: null }
  }

  // "after:<UUID>": insert after the referenced block
  if (position.startsWith('after:')) {
    const uuid = position.slice(6)
    const found = list.find((b) => b.uuid === uuid)
    if (!found) {
      return {
        error: `Position "after:${uuid}": paragraph not found in field "${fieldName}".`,
      }
    }
    return { afterUuid: uuid }
  }

  // "before:<UUID>": insert before the referenced block
  if (position.startsWith('before:')) {
    const uuid = position.slice(7)
    const index = list.findIndex((b) => b.uuid === uuid)
    if (index === -1) {
      return {
        error: `Position "before:${uuid}": paragraph not found in field "${fieldName}".`,
      }
    }
    // If it's the first block, afterUuid is null (insert at beginning)
    const preceding = index > 0 ? list[index - 1] : undefined
    return { afterUuid: preceding?.uuid ?? null }
  }

  return {
    error: `Invalid position value: "${position}". Use "start", "end", "after:<UUID>", or "before:<UUID>".`,
  }
}
