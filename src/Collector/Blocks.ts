import { resolveFiles } from '@nuxt/kit'
import path from 'node:path'
import { dirname } from 'pathe'
import { CollectedFile, Collector } from './index'
import micromatch from 'micromatch'
import type { ModuleHelper } from '../module/ModuleHelper'
import type {
  ExtractedBlockDefinitionInput,
  ExtractedFragmentDefinitionInput,
} from '../module/types'
import type { TemplateDependency } from '../module/templates/defineTemplate'
import {
  extractObjectLiteral,
  parseTsObject,
  toValidVariableName,
} from '../helpers'
import { hash } from 'ohash'

export type ExtractedDefinition =
  | ExtractedBlockDefinitionInput
  | ExtractedFragmentDefinitionInput

const DEFINE_BLOKKLI = 'defineBlokkli'
const DEFINE_BLOKKLI_FRAGMENT = 'defineBlokkliFragment'

type CollectedBlockType = 'main' | 'context' | 'fragment'

function isEditComponent(filePath: string): boolean {
  return filePath.endsWith('/diff.vue') || filePath.endsWith('/proxy.vue')
}

export function isBlock(
  definition: ExtractedDefinition,
): definition is ExtractedBlockDefinitionInput {
  return 'bundle' in definition
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
  }

  return [`fragment:${definition.name}`]
}

export function getIdentifier(definition: ExtractedDefinition) {
  const type = isBlock(definition) ? 'b' : 'f'
  let name = isBlock(definition) ? definition.bundle : definition.name
  return toValidVariableName(
    type + '_' + hash(name + getVariations(definition).join('__')),
  )
}

export class CollectedBlockFile extends CollectedFile {
  folder = ''
  iconPath: string | null = null
  iconContents: string | null = null
  diffComponentPath: string | null = null
  proxyComponentPath: string | null = null
  type: CollectedBlockType | null = null
  definition:
    | ExtractedFragmentDefinitionInput
    | ExtractedBlockDefinitionInput
    | null = null
  definitionSource: string | null = null
  hasBlokkliField = false

  identifier = ''
  chunkName = 'global'
  variations: string[] = []

  private objectLiteralString = ''

  private hasSiblingFile(name: string, helper: ModuleHelper): string | null {
    const siblingFilePath = path.join(this.folder, '/' + name)

    if (helper.fileCache.fileExists(siblingFilePath)) {
      return siblingFilePath
    }

    return null
  }

  override async handleChange(helper: ModuleHelper): Promise<boolean> {
    this.folder = dirname(this.filePath)
    const diffComponentPath = this.hasSiblingFile('diff.vue', helper)
    const proxyComponentPath = this.hasSiblingFile('proxy.vue', helper)

    const objectLiteralString = extractObjectLiteral(this.fileContents, [
      DEFINE_BLOKKLI,
      DEFINE_BLOKKLI_FRAGMENT,
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
    } else {
      this.type = 'fragment'
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
}

export class BlockCollector extends Collector<CollectedBlockFile> {
  private patterns: string[]

  constructor(helper: ModuleHelper) {
    super(helper)

    this.patterns = (helper.options.pattern || []).map((pattern) => {
      if (pattern.startsWith('/')) {
        return pattern
      }
      return helper.resolvers.src.resolve(pattern)
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
      content.includes(DEFINE_BLOKKLI_FRAGMENT)
    )
  }

  override getDependencyTypes(): TemplateDependency[] {
    return ['block-content', 'block-path']
  }
}
