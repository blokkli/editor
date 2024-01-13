import fs from 'fs'
import path from 'path'
import type {
  BlockDefinitionInput,
  BlockDefinitionOptionsInput,
} from '../runtime/types'

type ExtractedDefinition = {
  filePath: string
  icon?: string
  chunkName: string
  componentName: string
  definition: BlockDefinitionInput<any>
  source: string
}

/**
 * Service to handle text extractions across multiple files.
 */
export default class BlockExtractor {
  definitions: Record<string, ExtractedDefinition> = {}
  isBuild = false
  composableName: string

  constructor(isBuild = false, composableName: string) {
    this.isBuild = isBuild
    this.composableName = composableName
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
   * Read the file and extract the blokkli component definitions.
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

    // New file that didn't previously contain a blokkli component definition.
    if (!this.definitions[filePath]) {
      this.definitions[filePath] = {
        filePath,
        definition,
        icon,
        chunkName: definition.chunkName || 'global',
        componentName: 'BlokkliComponent_' + definition.bundle,
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
  ): { definition: BlockDefinitionInput<any>; source: string } | undefined {
    const pattern = this.composableName + '\\((\\{.+?\\})\\)'
    const rgx = new RegExp(pattern, 'gms')
    const source = rgx.exec(code)?.[1]
    if (source) {
      try {
        // @ts-ignore
        const definition = eval(`(${source})`)
        return { definition, source }
      } catch (e) {
        console.error(
          `Failed to parse component "${filePath}": ${this.composableName} does not contain a valid object literal. No variables and methods are allowed inside ${this.composableName}().`,
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
    globalOptions: BlockDefinitionOptionsInput = {},
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

    return `import type { BlockDefinitionInput } from '#blokkli/types'
export const globalOptions = ${JSON.stringify(globalOptions, null, 2)} as const

export const icons: Record<string, string> = ${JSON.stringify(icons)}

export const definitionsMap: Record<string, BlockDefinitionInput> = {
  ${allDefinitions.join(',\n')}
}

export const definitions: BlockDefinitionInput[] = Object.values(definitionsMap)

export const getDefinition = (bundle: string): BlockDefinitionInput|undefined => definitionsMap[bundle]
`
  }

  /**
   * Generate the default global options values template.
   */
  generateDefaultGlobalOptions(
    globalOptions: BlockDefinitionOptionsInput = {},
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
import type { GlobalOptionsType } from '#blokkli/generated-types'
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
    const allDefintions: BlockDefinitionInput<any>[] = Object.values(
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
    const validGlobalOptions = globalOptionKeys
      .map((v) => {
        return `'${v}'`
      })
      .join(' | ')
    const validParentItemBundles = allDefintions
      .filter((v) => v.bundle !== 'from_library')
      .map((v) => {
        return `'${v.bundle}'`
      })
      .join(' | ')
    return `
import type { BlockDefinitionInput } from '#blokkli/types'
export type ValidFieldListTypes = ${validFieldListTypes}
export type ValidParentItemBundle = ${validParentItemBundles || `''`}
export type ValidChunkNames = ${validChunkNames}
export type GlobalOptionsType = ${validGlobalOptions || 'never'}
export type ValidGlobalConfigKeys = Array<GlobalOptionsType>
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
    import { defineAsyncComponent } from '#imports'
    ${this.generateChunkGroup('global')}

const chunks: Record<string, () => Promise<any>> = {
  ${chunkImports.join(',\n  ')}
}

const chunkMapping: Record<string, string> = ${JSON.stringify(
      nonGlobalChunkMapping,
      null,
      2,
    )}

export function getBlokkliItemComponent(bundle: string): any {
  if (global[bundle]) {
    return global[bundle]
  }
  const chunkName = chunkMapping[bundle]
  if (chunkName) {
    return defineAsyncComponent(() => chunks[chunkName]().then(chunk => {
      return chunk.default[bundle]
    }))
  }
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
