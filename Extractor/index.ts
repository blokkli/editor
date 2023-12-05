import fs from 'fs'
import path from 'path'
import {
  ParagraphDefinitionInput,
  ParagraphDefinitionOptionsInput,
} from '../runtime/types'

type ExtractedParagraph = {
  filePath: string
  icon?: string
  chunkName: string
  componentName: string
  definition: ParagraphDefinitionInput<any>
  source: string
}

/**
 * Service to handle text extractions across multiple files.
 */
export default class Extractor {
  definitions: Record<string, ExtractedParagraph> = {}
  isBuild = false

  constructor(isBuild = false) {
    this.isBuild = isBuild
  }

  /**
   * Add files by path.
   */
  addFiles(files: string[]): Promise<boolean[]> {
    return Promise.all(files.map((v) => this.handleFile(v)))
  }

  async getIcon(componentPath: string): Promise<string | undefined> {
    const folder = path.dirname(componentPath)
    const iconPath = path.join(folder, '/icon.svg')
    try {
      await fs.promises.access(iconPath, fs.constants.F_OK)
      const data = await fs.promises.readFile(iconPath)
      return data.toString()
    } catch (e) {
      return
    }
  }

  /**
   * Read the file and extract the paragraph definitions.
   *
   * Returns a promise containing a boolean that indicated if the given file
   * should trigger a rebuild of the query.
   */
  async handleFile(filePath: string): Promise<boolean> {
    const fileSource = await this.readFile(filePath)
    const extracted = this.extractSingle(fileSource, filePath)
    if (!extracted) {
      if (this.definitions[filePath]) {
        delete this.definitions[filePath]
        return true
      }

      return false
    }

    const { definition, source } = extracted

    const icon = await this.getIcon(filePath)

    // New file that didn't previously contain a paragraph definition.
    if (!this.definitions[filePath]) {
      this.definitions[filePath] = {
        filePath,
        definition,
        icon,
        chunkName: definition.chunkName || 'global',
        componentName: 'Paragraph_' + definition.bundle,
        source,
      }
      return true
    }

    // If the the definition didn't change, return.
    if (this.definitions[filePath].definition === definition) {
      return false
    }

    // Update the definition.
    this.definitions[filePath].definition = definition
    this.definitions[filePath].icon = icon

    return true
  }

  /**
   * Extract the single text method calls.
   */
  extractSingle(
    code: string,
    filePath: string,
  ): { definition: ParagraphDefinitionInput<any>; source: string } | undefined {
    const rgx = /defineParagraph\((\{.+?\})\)/gms
    const source = rgx.exec(code)?.[1]
    if (source) {
      try {
        const definition = eval(`(${source})`)
        return { definition, source }
      } catch (e) {
        console.error(
          `Failed to parse Paragraph component "${filePath}": defineParagraph does not contain a valid object literal. No variables and methods are allowed inside defineParagraph().`,
        )
      }
    }
  }

  /**
   * Read the given file and return its contents.
   */
  readFile(filePath: string) {
    return fs.promises.readFile(filePath).then((v) => {
      return v.toString()
    })
  }

  /**
   * Generate the template.
   */
  generateDefinitionTemplate(
    globalOptions: ParagraphDefinitionOptionsInput = {},
  ): string {
    const allDefinitions = Object.values(this.definitions).map((v) => {
      return `${v.definition.bundle}: ${v.source}`
    })

    const icons = Object.values(this.definitions).reduce<
      Record<string, string>
    >((acc, v) => {
      if (v.icon) {
        acc[v.definition.bundle] = v.icon
      }
      return acc
    }, {})

    return `import { ParagraphDefinitionInput } from '#blokkli/types'
import { TypedParagraphDefinitionInput } from '#blokkli/generated-types'

export const globalOptions = ${JSON.stringify(globalOptions, null, 2)} as const

export const icons: Record<string, string> = ${JSON.stringify(icons)}

export const definitionsMap: Record<string, TypedParagraphDefinitionInput> = {
  ${allDefinitions.join(',\n')}
}

export const definitions: TypedParagraphDefinitionInput[] = Object.values(definitionsMap)

export const getDefinition = (bundle: string): TypedParagraphDefinitionInput|undefined => definitionsMap[bundle]
`
  }

  /**
   * Generate the default global options values template.
   */
  generateDefaultGlobalOptions(
    globalOptions: ParagraphDefinitionOptionsInput = {},
  ): string {
    const defaults = Object.entries(globalOptions).reduce<
      Record<string, string>
    >((acc, [key, option]) => {
      if (option.default) {
        acc[key] = option.default
      }
      return acc
    }, {})
    return `
import { GlobalOptionsType } from '#blokkli/generated-types'
export const globalOptionsDefaults: Record<GlobalOptionsType, string> = ${JSON.stringify(
      defaults,
      null,
      2,
    )} as const`
  }

  generateTypesTemplate(
    globalOptionKeys: string[],
    chunkNames: string[],
    fieldListTypes: string[],
  ): string {
    const allDefintions: ParagraphDefinitionInput<any>[] = Object.values(
      this.definitions,
    ).map((v) => v.definition)
    const validChunkNames = chunkNames
      .map((v) => {
        return `'${v}'`
      })
      .join(' | ')
    const validFieldListTypes = fieldListTypes
      .map((v) => {
        return `'${v}'`
      })
      .join(' | ')
    const validParagraphBundles = allDefintions
      .map((v) => {
        return `'${v.bundle}'`
      })
      .join(' | ')
    const validGlobalOptions = globalOptionKeys
      .map((v) => {
        return `'${v}'`
      })
      .join(' | ')
    const validParentParagraphBundles = allDefintions
      .filter((v) => v.bundle !== 'from_library')
      .map((v) => {
        return `'${v.bundle}'`
      })
      .join(' | ')
    return `
import { ParagraphDefinitionInput } from '#blokkli/types'
export type ValidFieldListTypes = ${validFieldListTypes}
export type ValidParagraphBundle = ${validParagraphBundles}
export type ValidParentParagraphBundle = ${validParentParagraphBundles}
export type ValidChunkNames = ${validChunkNames}
export type GlobalOptionsType = ${validGlobalOptions || 'never'}
export type ValidGlobalConfigKeys = Array<GlobalOptionsType>
export type TypedParagraphDefinitionInput = ParagraphDefinitionInput<ValidChunkNames, ValidGlobalConfigKeys>
`
  }

  /**
   * Generate the template.
   */
  generateImportsTemplate(chunkNames: string[]): string {
    const chunkImports = chunkNames
      .filter((v) => v !== 'global')
      .map((chunkName) => {
        return `${chunkName}: () => import('#blokkli/chunk-${chunkName}')`
      })

    const nonGlobalChunkMapping = Object.values(this.definitions).reduce<
      Record<string, string>
    >((acc, v) => {
      if (v.chunkName !== 'global') {
        acc[v.definition.bundle] = v.chunkName
      }
      return acc
    }, {})

    return `
    ${this.generateChunkGroup('global')}

const chunks: Record<string, () => Promise<any>> = {
  ${chunkImports.join(',\n  ')}
}

const chunkMapping: Record<string, string> = ${JSON.stringify(
      nonGlobalChunkMapping,
      null,
      2,
    )}

export async function getParagraphComponent(bundle: string): Promise<any> {
  if (global[bundle]) {
    return global[bundle]
  }
  const chunkName = chunkMapping[bundle]
  if (chunkName) {
    return chunks[chunkName]().then(chunk => {
      return chunk.default[bundle]
    })
  }
  return Promise.resolve()
}`
  }

  /**
   * Generate the template.
   */
  generateChunkGroup(chunkName: string, addExport?: boolean): string {
    const definitions = Object.values(this.definitions).filter((v) => {
      return v.chunkName === chunkName
    })
    const imports = definitions.map((v) => {
      return `import ${v.componentName} from '${v.filePath}'`
    })
    const map = definitions.map((v) => {
      return `${v.definition.bundle}: ${v.componentName}`
    })
    let content = `
${imports.join('\n')}

const ${chunkName}: Record<string, any> = {
  ${map.join(',\n  ')}
}
`
    if (addExport) {
      content += `export default ${chunkName}`
    }
    return content
  }
}
