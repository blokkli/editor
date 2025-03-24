import { resolveFiles } from '@nuxt/kit'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { CollectedFile, Collector } from './index'
import * as micromatch from 'micromatch'
import type { ModuleHelper } from '../module/ModuleHelper'
import type {
  ExtractedBlockDefinitionInput,
  ExtractedFragmentDefinitionInput,
} from '../module/types'
import type { TemplateDependency } from '../module/templates/defineTemplate'

const DEFINE_BLOKKLI = 'defineBlokkli'
const DEFINE_BLOKKLI_FRAGMENT = 'defineBlokkliFragment'

type CollectedBlockType = 'main' | 'context' | 'fragment'

type ExtractedDefinition =
  | ExtractedBlockDefinitionInput
  | ExtractedFragmentDefinitionInput

export function isBlock(
  definition: ExtractedDefinition,
): definition is ExtractedBlockDefinitionInput {
  return 'bundle' in definition
}

function getIdentifier(definition: ExtractedDefinition) {
  const parts: string[] = []
  if (isBlock(definition)) {
    parts.push('block', definition.bundle)
    if (definition.renderFor) {
      const renderFor = Array.isArray(definition.renderFor)
        ? definition.renderFor
        : [definition.renderFor]
      renderFor.forEach((entry) => {
        if ('parentBundle' in entry) {
          parts.push('parent_block', entry.parentBundle)
        } else if ('fieldList' in entry) {
          parts.push('field_list_type', entry.fieldList)
        } else if ('fieldListType' in entry) {
          parts.push('field_list_type', entry.fieldListType)
        }
      })
    }
  } else {
    parts.push('fragment', definition.name)
  }

  return parts.join('__')
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
    return renderFor.map((v) => {
      if ('parentBundle' in v) {
        return `block:${bundle}__parent:${v.parentBundle}`
      } else if ('fieldList' in v) {
        return `block:${bundle}__field:${v.fieldList}`
      } else {
        return `block:${bundle}__field:${v.fieldListType}`
      }
    })
  }

  return [`fragment:${definition.name}`]
}

export class CollectedBlockFile extends CollectedFile {
  folder = ''
  iconPath: string | null = null
  diffComponentPath: string | null = null
  proxyComponentPath: string | null = null
  type: CollectedBlockType | null = null
  definitionSource: string | null = null
  definition:
    | ExtractedFragmentDefinitionInput
    | ExtractedBlockDefinitionInput
    | null = null
  hasBlokkliField = false

  identifier: string | null = ''
  chunkName = 'global'
  variations: string[] = []

  private hasSiblingFile(name: string): string | null {
    const siblingFilePath = path.join(this.folder, '/' + name)
    return existsSync(siblingFilePath) ? siblingFilePath : null
  }

  override async handleChange(): Promise<boolean> {
    this.folder = path.dirname(this.filePath)
    this.iconPath = this.hasSiblingFile('icon.svg')
    this.diffComponentPath = this.hasSiblingFile('diff.vue')
    this.proxyComponentPath = this.hasSiblingFile('proxy.vue')

    const extracted = this.extract()
    this.definitionSource = extracted?.source || null
    this.definition = extracted?.definition || null

    this.hasBlokkliField =
      this.fileContents.includes('<BlokkliField') ||
      this.fileContents.includes('<blokkli-field') ||
      this.fileContents.includes(':is="BlokkliField"')

    this.chunkName = this.definition?.chunkName || 'global'
    this.identifier = this.definition ? getIdentifier(this.definition) : null

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

    this.variations = getVariations(this.definition)

    return true
  }

  extract():
    | {
        definition:
          | ExtractedBlockDefinitionInput
          | ExtractedFragmentDefinitionInput
        source: string
      }
    | undefined {
    const pattern =
      `(${DEFINE_BLOKKLI}|${DEFINE_BLOKKLI_FRAGMENT})` + '\\((\\{.+?\\})\\)'
    const rgx = new RegExp(pattern, 's')
    const matches = rgx.exec(this.fileContents)
    if (!matches) {
      return
    }

    const composableName = matches?.at(1)
    const source = matches?.at(2)
    if (!source) {
      return
    }

    try {
      const definition = eval(`(${source})`)
      return { definition, source }
    } catch (e) {
      console.error(
        `Failed to parse component "${this.filePath}": ${composableName} does not contain a valid object literal. No variables and methods are allowed inside ${composableName}().`,
        e,
      )
    }
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

  public override createCollectedFile(
    filePath: string,
    fileContents = '',
  ): CollectedBlockFile {
    return new CollectedBlockFile(filePath, fileContents)
  }

  public override async applies(filePath: string): Promise<boolean> {
    if (!filePath.endsWith('.vue')) {
      return false
    }

    if (!micromatch.isMatch(filePath, this.patterns)) {
      return false
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
