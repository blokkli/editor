import { resolveAlias, resolveFiles } from '@nuxt/kit'
import path from 'node:path'
import { dirname } from 'pathe'
import { CollectedFile, Collector, type ValidationError } from './index'
import micromatch from 'micromatch'
import type { ModuleHelper } from '../ModuleHelper'
import type { TemplateDependency } from '../templates/defineTemplate'
import {
  extractObjectLiteral,
  parseTsObject,
  toValidVariableName,
} from '../helpers'
import { hash } from 'ohash'
import { logger } from '../logger'
import type {
  BlockDefinitionInputBase,
  FragmentDefinitionInputBase,
  ProviderDefinitionInputBase,
} from './../../shared/types/definitions'

export type ExtractedDefinition =
  | BlockDefinitionInputBase
  | FragmentDefinitionInputBase
  | ProviderDefinitionInputBase

const DEFINE_BLOKKLI = 'defineBlokkli'
const DEFINE_BLOKKLI_FRAGMENT = 'defineBlokkliFragment'
const DEFINE_BLOKKLI_PROVIDER = 'defineBlokkliProvider'

type CollectedBlockType = 'main' | 'context' | 'fragment' | 'provider'

function isEditComponent(filePath: string): boolean {
  return filePath.endsWith('/diff.vue') || filePath.endsWith('/proxy.vue')
}

export function isBlock(
  definition: ExtractedDefinition,
): definition is BlockDefinitionInputBase {
  return 'bundle' in definition && !('entityType' in definition)
}

export function isFragment(
  definition: ExtractedDefinition,
): definition is FragmentDefinitionInputBase {
  return 'name' in definition
}

function getVariations(definition?: ExtractedDefinition | null): string[] {
  if (!definition) {
    return []
  }

  if (isBlock(definition)) {
    const bundle = definition.bundle
    if (!definition.renderFor) {
      return ['block:' + bundle]
    }
    const renderFor = Array.isArray(definition.renderFor)
      ? definition.renderFor
      : [definition.renderFor]
    return renderFor
      .map((v) => {
        if ('parentBundle' in v) {
          return `block:${bundle}__p:${v.parentBundle}`
        } else if ('fieldList' in v) {
          return `block:${bundle}__f:${v.fieldList}`
        } else {
          return `block:${bundle}__f:${v.fieldListType}`
        }
      })
      .sort()
  } else if (isFragment(definition)) {
    return [`fragment:${definition.name}`]
  }

  return [`provider:${definition.entityType}:${definition.bundle}`]
}

export function getIdentifier(definition: ExtractedDefinition) {
  if (isBlock(definition)) {
    return toValidVariableName(
      'b_' + hash(definition.bundle + getVariations(definition).join('__')),
    )
  } else if (isFragment(definition)) {
    return toValidVariableName(
      'f_' + hash(definition.name + getVariations(definition).join('__')),
    )
  }
  return toValidVariableName(
    'p_' +
      hash(
        definition.entityType +
          '__' +
          definition.bundle +
          getVariations(definition).join('__'),
      ),
  )
}

export type BlockValidationError = ValidationError & {
  optionKey?: string
}

/**
 * Validate a single option and return any errors.
 */
function validateOption(
  optionKey: string,
  option: Record<string, any>,
): BlockValidationError[] {
  const errors: BlockValidationError[] = []

  switch (option.type) {
    case 'radios': {
      // Validate that the default value matches one of the defined options
      const defaultValue = option.default
      const availableOptions = option.options

      if (
        availableOptions &&
        typeof availableOptions === 'object' &&
        defaultValue !== undefined
      ) {
        const optionKeys = Object.keys(availableOptions)
        if (!optionKeys.includes(defaultValue)) {
          errors.push({
            message: `Option "${optionKey}" has default value "${defaultValue}" which is not one of the available options: ${optionKeys.map((k) => `"${k}"`).join(', ')}`,
            optionKey,
          })
        }
      }
      break
    }

    case 'checkboxes': {
      // Validate that each default value matches one of the defined options
      const defaultValues = option.default
      const availableOptions = option.options

      if (
        Array.isArray(defaultValues) &&
        availableOptions &&
        typeof availableOptions === 'object'
      ) {
        const optionKeys = Object.keys(availableOptions)
        for (const value of defaultValues) {
          if (!optionKeys.includes(value)) {
            errors.push({
              message: `Option "${optionKey}" has default value "${value}" which is not one of the available options: ${optionKeys.map((k) => `"${k}"`).join(', ')}`,
              optionKey,
            })
          }
        }
      }
      break
    }

    case 'number':
    case 'range': {
      // Validate that the default value is within the min/max range
      const defaultValue = option.default
      const min = option.min
      const max = option.max

      if (typeof defaultValue === 'number') {
        if (typeof min === 'number' && defaultValue < min) {
          errors.push({
            message: `Option "${optionKey}" has default value ${defaultValue} which is less than the minimum value ${min}`,
            optionKey,
          })
        }
        if (typeof max === 'number' && defaultValue > max) {
          errors.push({
            message: `Option "${optionKey}" has default value ${defaultValue} which is greater than the maximum value ${max}`,
            optionKey,
          })
        }
      }
      break
    }

    case 'color': {
      // Validate that the default value is a valid hex color
      const defaultValue = option.default

      if (typeof defaultValue === 'string') {
        const hexColorRegex = /^#[0-9A-F]{6}$/i
        if (!hexColorRegex.test(defaultValue)) {
          errors.push({
            message: `Option "${optionKey}" has default value "${defaultValue}" which is not a valid hex color (expected format: #RRGGBB)`,
            optionKey,
          })
        }
      }
      break
    }

    case 'datetime-local': {
      // Validate that the default value is between min and max if specified
      const defaultValue = option.default
      const min = option.min
      const max = option.max

      if (typeof defaultValue === 'string') {
        const defaultDate = new Date(defaultValue)
        if (Number.isNaN(defaultDate.getTime())) {
          errors.push({
            message: `Option "${optionKey}" has default value "${defaultValue}" which is not a valid datetime`,
            optionKey,
          })
        } else {
          if (typeof min === 'string') {
            const minDate = new Date(min)
            if (!Number.isNaN(minDate.getTime()) && defaultDate < minDate) {
              errors.push({
                message: `Option "${optionKey}" has default value "${defaultValue}" which is before the minimum "${min}"`,
                optionKey,
              })
            }
          }
          if (typeof max === 'string') {
            const maxDate = new Date(max)
            if (!Number.isNaN(maxDate.getTime()) && defaultDate > maxDate) {
              errors.push({
                message: `Option "${optionKey}" has default value "${defaultValue}" which is after the maximum "${max}"`,
                optionKey,
              })
            }
          }
        }
      }
      break
    }
  }

  return errors
}

/**
 * Validate a block definition and return any errors or warnings.
 */
export function validateBlockDefinition(
  definition: BlockDefinitionInputBase | FragmentDefinitionInputBase,
): BlockValidationError[] {
  const errors: BlockValidationError[] = []

  // Validate options if present
  if ('options' in definition && definition.options) {
    const options = definition.options as Record<string, any>

    for (const [optionKey, option] of Object.entries(options)) {
      if (!option || typeof option !== 'object') {
        continue
      }

      const optionErrors = validateOption(optionKey, option)
      errors.push(...optionErrors)
    }
  }

  // Check for deprecated fieldList in renderFor (blocks only)
  if ('renderFor' in definition && definition.renderFor) {
    const renderFor = Array.isArray(definition.renderFor)
      ? definition.renderFor
      : [definition.renderFor]

    for (const entry of renderFor) {
      if ('fieldList' in entry) {
        errors.push({
          message: `renderFor uses deprecated "fieldList" property. Use "fieldListType" instead.`,
          severity: 'warning',
        })
      }
    }
  }

  return errors
}

export class CollectedBlockFile extends CollectedFile {
  folder = ''
  iconPath: string | null = null
  iconContents: string | null = null
  diffComponentPath: string | null = null
  proxyComponentPath: string | null = null
  type: CollectedBlockType | null = null
  definition: FragmentDefinitionInputBase | BlockDefinitionInputBase | null =
    null
  definitionSource: string | null = null
  hasBlokkliField = false

  identifier = ''
  chunkName = 'global'
  variations: string[] = []

  private objectLiteralString = ''
  private validationCache: BlockValidationError[] | null = null

  private hasSiblingFile(name: string, helper: ModuleHelper): string | null {
    const siblingFilePath = path.join(this.folder, '/' + name)

    if (helper.fileCache.fileExists(siblingFilePath)) {
      return siblingFilePath
    }

    return null
  }

  override async handleChange(helper: ModuleHelper): Promise<boolean> {
    // Invalidate validation cache on any change
    this.validationCache = null

    this.folder = dirname(this.filePath)
    const diffComponentPath = this.hasSiblingFile('diff.vue', helper)
    const proxyComponentPath = this.hasSiblingFile('proxy.vue', helper)

    const objectLiteralString = extractObjectLiteral(this.fileContents, [
      DEFINE_BLOKKLI,
      DEFINE_BLOKKLI_FRAGMENT,
      DEFINE_BLOKKLI_PROVIDER,
    ])

    // Nothing changed.
    if (
      objectLiteralString === this.objectLiteralString &&
      diffComponentPath === this.diffComponentPath &&
      proxyComponentPath === this.proxyComponentPath
    ) {
      return false
    }

    this.objectLiteralString = objectLiteralString || ''
    this.diffComponentPath = diffComponentPath
    this.proxyComponentPath = proxyComponentPath

    try {
      if (this.objectLiteralString) {
        const result = parseTsObject<ExtractedDefinition>(
          this.objectLiteralString,
        )
        this.definition = result.object
        this.definitionSource = result.source
      }
    } catch (e) {
      console.log(e)
      console.error(
        `Failed to parse component "${this.filePath}": The composabe does not contain a valid object literal. No variables and methods are allowed inside the composable.`,
        e,
      )

      return false
    }

    this.hasBlokkliField =
      this.fileContents.includes('<BlokkliField') ||
      this.fileContents.includes('<blokkli-field') ||
      this.fileContents.includes(':is="BlokkliField"')

    this.chunkName = this.definition?.chunkName || 'global'
    this.identifier = this.definition ? getIdentifier(this.definition) : ''

    if (!this.definition) {
      this.type = null
    } else if (isBlock(this.definition)) {
      if (this.definition.renderFor) {
        this.type = 'context'
      } else {
        this.type = 'main'
      }
    } else if (isFragment(this.definition)) {
      this.type = 'fragment'
    } else {
      this.type = 'provider'
    }

    // Only collect the icon for the main block entry.
    if (this.type === 'main') {
      this.iconPath = this.hasSiblingFile('icon.svg', helper)

      if (this.iconPath) {
        this.iconContents = await helper.fileCache.read(this.iconPath)
      }
    } else {
      this.iconPath = null
      this.iconContents = null
    }

    this.variations = getVariations(this.definition)

    return true
  }

  /**
   * Validate the block definition and return any errors.
   * Results are cached and invalidated when the file changes.
   */
  override validate(): BlockValidationError[] {
    // Return cached results if available
    if (this.validationCache !== null) {
      return this.validationCache
    }

    if (!this.definition) {
      this.validationCache = []
      return this.validationCache
    }

    const errors = validateBlockDefinition(this.definition)

    // Check for missing icon on main blocks
    if (this.type === 'main' && isBlock(this.definition)) {
      const hasIconFile = !!this.iconPath
      const hasEditorIcon = !!(
        this.definition.editor &&
        'icon' in this.definition.editor &&
        this.definition.editor.icon
      )

      if (!hasIconFile && !hasEditorIcon) {
        errors.push({
          message: `Block is missing an icon. Add an icon.svg file or set editor.icon in the definition.`,
          severity: 'warning',
        })
      }
    }

    this.validationCache = errors
    return this.validationCache
  }
}

export type BundleOptionConflict = {
  bundle: string
  optionKey: string
  reason: 'type' | 'options'
  conflicts: Array<{
    filePath: string
    type: string
    optionKeys?: string[]
  }>
}

type OptionInfo = {
  filePath: string
  type: string
  optionKeys?: string[]
}

/**
 * Validate that options with the same key have compatible types and
 * option keys across all components of the same bundle.
 */
export function validateBundleOptionCompatibility(
  files: CollectedBlockFile[],
): BundleOptionConflict[] {
  const conflicts: BundleOptionConflict[] = []

  // Group blocks by bundle (only actual blocks, not fragments or providers)
  const bundleGroups = new Map<string, CollectedBlockFile[]>()

  for (const file of files) {
    if (!file.definition || !isBlock(file.definition)) {
      continue
    }

    const bundle = file.definition.bundle
    const existing = bundleGroups.get(bundle) || []
    existing.push(file)
    bundleGroups.set(bundle, existing)
  }

  // For each bundle with multiple components, validate option compatibility
  for (const [bundle, bundleFiles] of bundleGroups) {
    if (bundleFiles.length < 2) {
      continue
    }

    // Collect all options across all components for this bundle
    const optionInfos = new Map<string, OptionInfo[]>()

    for (const file of bundleFiles) {
      if (!file.definition || !isBlock(file.definition)) {
        continue
      }

      const options = file.definition.options as
        | Record<string, Record<string, any>>
        | undefined
      if (!options) {
        continue
      }

      for (const [optionKey, option] of Object.entries(options)) {
        if (!option || typeof option !== 'object' || !option.type) {
          continue
        }

        const info: OptionInfo = {
          filePath: file.filePath,
          type: option.type,
        }

        // For radios and checkboxes, also collect the option keys
        if (
          (option.type === 'radios' || option.type === 'checkboxes') &&
          option.options &&
          typeof option.options === 'object'
        ) {
          info.optionKeys = Object.keys(option.options).sort()
        }

        const existing = optionInfos.get(optionKey) || []
        existing.push(info)
        optionInfos.set(optionKey, existing)
      }
    }

    // Check for conflicts
    for (const [optionKey, entries] of optionInfos) {
      if (entries.length < 2) {
        continue
      }

      // Check for type conflicts
      const types = new Set(entries.map((e) => e.type))
      if (types.size > 1) {
        conflicts.push({
          bundle,
          optionKey,
          reason: 'type',
          conflicts: entries,
        })
        continue
      }

      // For radios and checkboxes, check for option key conflicts
      const entriesWithOptionKeys = entries.filter((e) => e.optionKeys)
      if (entriesWithOptionKeys.length >= 2) {
        const optionKeySets = entriesWithOptionKeys.map((e) =>
          e.optionKeys!.join(','),
        )
        const uniqueOptionKeySets = new Set(optionKeySets)
        if (uniqueOptionKeySets.size > 1) {
          conflicts.push({
            bundle,
            optionKey,
            reason: 'options',
            conflicts: entriesWithOptionKeys,
          })
        }
      }
    }
  }

  return conflicts
}

export type RenderForConflict = {
  bundle: string
  variation: string
  filePaths: string[]
}

/**
 * Validate that no two components of the same bundle have overlapping
 * renderFor entries.
 */
export function validateRenderForConflicts(
  files: CollectedBlockFile[],
): RenderForConflict[] {
  const conflicts: RenderForConflict[] = []

  // Group blocks by bundle (only actual blocks, not fragments or providers)
  const bundleGroups = new Map<string, CollectedBlockFile[]>()

  for (const file of files) {
    if (!file.definition || !isBlock(file.definition)) {
      continue
    }

    const bundle = file.definition.bundle
    const existing = bundleGroups.get(bundle) || []
    existing.push(file)
    bundleGroups.set(bundle, existing)
  }

  // For each bundle with multiple components, check for duplicate variations
  for (const [bundle, bundleFiles] of bundleGroups) {
    if (bundleFiles.length < 2) {
      continue
    }

    // Collect all variations and their file paths
    const variationToFiles = new Map<string, string[]>()

    for (const file of bundleFiles) {
      for (const variation of file.variations) {
        const existing = variationToFiles.get(variation) || []
        existing.push(file.filePath)
        variationToFiles.set(variation, existing)
      }
    }

    // Check for duplicates
    for (const [variation, filePaths] of variationToFiles) {
      if (filePaths.length > 1) {
        conflicts.push({
          bundle,
          variation,
          filePaths,
        })
      }
    }
  }

  return conflicts
}

export type MissingMainComponentError = {
  bundle: string
  filePaths: string[]
}

/**
 * Validate that each bundle has at least one main component (without renderFor).
 */
export function validateMissingMainComponent(
  files: CollectedBlockFile[],
): MissingMainComponentError[] {
  const errors: MissingMainComponentError[] = []

  // Group blocks by bundle (only actual blocks, not fragments or providers)
  const bundleGroups = new Map<string, { main: string[]; context: string[] }>()

  for (const file of files) {
    if (!file.definition || !isBlock(file.definition)) {
      continue
    }

    const bundle = file.definition.bundle
    const existing = bundleGroups.get(bundle) || { main: [], context: [] }

    if (file.type === 'main') {
      existing.main.push(file.filePath)
    } else if (file.type === 'context') {
      existing.context.push(file.filePath)
    }

    bundleGroups.set(bundle, existing)
  }

  // Check for bundles that have context components but no main component
  for (const [bundle, { main, context }] of bundleGroups) {
    if (context.length > 0 && main.length === 0) {
      errors.push({
        bundle,
        filePaths: context,
      })
    }
  }

  return errors
}

export class BlockCollector extends Collector<CollectedBlockFile> {
  private patterns: string[]

  constructor(helper: ModuleHelper) {
    super(helper)

    this.patterns = (helper.options.pattern || []).map((pattern) => {
      if (pattern.startsWith('/')) {
        // Absolute.
        return pattern
      } else if (pattern.startsWith('.')) {
        // Relative to nuxt.config.ts.
        return helper.resolvers.src.resolve(pattern)
      }

      // Starts with an alias (~, @ or any custom alias).
      return resolveAlias(pattern)
    })
  }

  override async init() {
    const files = await resolveFiles(
      this.helper.nuxt.options.srcDir,
      this.patterns,
    )
    const promises: Promise<any>[] = []

    for (const filePath of files) {
      const applies = await this.applies(filePath)
      if (applies) {
        promises.push(this.addFile(filePath))
      }
    }

    await Promise.all(promises)
  }

  public runHooks() {
    return this.helper.nuxt.hooks.callHook('blokkli:alter-blocks', {
      blocks: [...this.files.values()],
    })
  }

  public createCollectedFile(
    filePath: string,
    fileContents = '',
  ): CollectedBlockFile {
    return new CollectedBlockFile(filePath, fileContents)
  }

  private findBlockForFolderFile(iconPath: string): string | null {
    for (const file of this.files.values()) {
      if (
        file.iconPath === iconPath ||
        file.proxyComponentPath === iconPath ||
        file.diffComponentPath === iconPath
      ) {
        return file.filePath
      }
    }

    return null
  }

  protected override async handleAdd(filePath: string): Promise<boolean> {
    if (isEditComponent(filePath)) {
      const folder = dirname(filePath)
      for (const file of this.files.values()) {
        if (file.folder === folder) {
          return super.handleChange(file.filePath)
        }
      }
    }

    return super.handleAdd(filePath)
  }

  protected override async handleUnlink(filePath: string): Promise<boolean> {
    if (isEditComponent(filePath)) {
      const folder = dirname(filePath)
      for (const file of this.files.values()) {
        if (file.folder === folder) {
          return super.handleChange(file.filePath)
        }
      }
    }

    return super.handleUnlink(filePath)
  }

  protected override async handleChange(filePath: string): Promise<boolean> {
    // Special handling for icon files: They don't directly exist as a
    // collected file, but are part of one single collected file.
    // Therefore, if we find a block that uses this icon, we have to update
    // it.
    if (filePath.includes('icon.svg')) {
      const matchingBlockFilePath = this.findBlockForFolderFile(filePath)
      if (matchingBlockFilePath) {
        return this.handleChange(matchingBlockFilePath)
      }

      return false
    }

    return super.handleChange(filePath)
  }

  public override async applies(filePath: string): Promise<boolean> {
    // Only Vue SFC are supported.
    if (!filePath.endsWith('.vue')) {
      return false
    }

    if (!micromatch.isMatch(filePath, this.patterns)) {
      return false
    }

    if (isEditComponent(filePath)) {
      return true
    }

    const content = await this.helper.fileCache.read(filePath)

    return (
      content.includes(DEFINE_BLOKKLI) ||
      content.includes(DEFINE_BLOKKLI_FRAGMENT) ||
      content.includes(DEFINE_BLOKKLI_PROVIDER)
    )
  }

  override getDependencyTypes(): TemplateDependency[] {
    return ['block-content', 'block-path']
  }

  override validate(): boolean {
    // Run base validation for individual files
    const hasFileErrors = super.validate()

    const files = [...this.files.values()]
    let hasCollectorErrors = false

    // Run bundle-level option compatibility validation
    const optionConflicts = validateBundleOptionCompatibility(files)

    if (optionConflicts.length > 0) {
      const lines = optionConflicts.flatMap((conflict) => {
        const reasonLabel =
          conflict.reason === 'type'
            ? 'conflicting types'
            : 'conflicting option keys'
        return [
          `  Bundle "${conflict.bundle}", option "${conflict.optionKey}" (${reasonLabel}):`,
          ...conflict.conflicts.map((c) => {
            if (conflict.reason === 'options' && c.optionKeys) {
              return `    - ${c.filePath} (keys: ${c.optionKeys.join(', ')})`
            }
            return `    - ${c.filePath} (type: ${c.type})`
          }),
        ]
      })
      logger.error(
        `blökkli option conflicts across bundle components:\n${lines.join('\n')}`,
      )
      hasCollectorErrors = true
    }

    // Run renderFor conflict validation
    const renderForConflicts = validateRenderForConflicts(files)

    if (renderForConflicts.length > 0) {
      const lines = renderForConflicts.flatMap((conflict) => [
        `  Bundle "${conflict.bundle}", variation "${conflict.variation}":`,
        ...conflict.filePaths.map((fp) => `    - ${fp}`),
      ])
      logger.error(`blökkli duplicate renderFor entries:\n${lines.join('\n')}`)
      hasCollectorErrors = true
    }

    // Run missing main component validation
    const missingMainErrors = validateMissingMainComponent(files)

    if (missingMainErrors.length > 0) {
      const lines = missingMainErrors.flatMap((error) => [
        `  Bundle "${error.bundle}":`,
        ...error.filePaths.map((fp) => `    - ${fp}`),
      ])
      logger.error(
        `blökkli bundles with renderFor components but no main component:\n${lines.join('\n')}`,
      )
      hasCollectorErrors = true
    }

    return hasFileErrors || hasCollectorErrors
  }
}
