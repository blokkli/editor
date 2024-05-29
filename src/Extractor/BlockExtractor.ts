import fs from 'fs'
import path from 'path'
import type {
  BlockDefinitionInput,
  BlockDefinitionOptionsInput,
  FragmentDefinitionInput,
} from '../runtime/types'
import { sortObjectKeys } from './../helpers'

function toPascalCase(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]+/g, ' ') // Replace any non-alphanumeric characters with spaces
    .trim() // Trim spaces around the string
    .split(/\s+/) // Split by spaces
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
    .join('') // Join all words into a single PascalCase string
}

type ExtractedBlockDefinitionInput = BlockDefinitionInput<{}, []>
type ExtractedFragmentDefinitionInput = FragmentDefinitionInput<{}, []>

type ExtractedDefinition = {
  filePath: string
  icon?: string
  chunkName: string
  componentName: string
  definition: ExtractedBlockDefinitionInput
  source: string
  fileSource: string
  hasBlokkliField: boolean
}

type ExtractedFragmentDefinition = {
  filePath: string
  chunkName: string
  componentName: string
  definition: ExtractedFragmentDefinitionInput
  source: string
  fileSource: string
}

/**
 * Service to handle text extractions across multiple files.
 */
export default class BlockExtractor {
  definitions: Record<string, ExtractedDefinition> = {}
  fragmentDefinitions: Record<string, ExtractedFragmentDefinition> = {}
  isBuild = false
  composableName: string
  fragmentComposableName: string

  constructor(isBuild = false) {
    this.isBuild = isBuild
    this.composableName = 'defineBlokkli'
    this.fragmentComposableName = 'defineBlokkliFragment'
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
    } catch (e) {}
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

      if (this.fragmentDefinitions[filePath]) {
        delete this.fragmentDefinitions[filePath]
        return true
      }

      return false
    }

    if ('bundle' in extracted.definition) {
      const icon = await this.getIcon(filePath)

      if (this.definitions[filePath]) {
        if (this.definitions[filePath].source === extracted.source) {
          return false
        }
      }

      const extension = path.extname(filePath)
      const componentFileName = path.basename(filePath, extension)

      this.definitions[filePath] = {
        filePath,
        definition: extracted.definition,
        icon,
        chunkName: (extracted.definition.chunkName || 'global') as any,
        componentName:
          'BlokkliComponent_' +
          extracted.definition.bundle +
          '_' +
          componentFileName,
        source: extracted.source,
        fileSource,
        hasBlokkliField:
          fileSource.includes('<BlokkliField') ||
          fileSource.includes('<blokkli-field') ||
          fileSource.includes(':is="BlokkliField"'),
      }
    } else if ('name' in extracted.definition) {
      if (this.fragmentDefinitions[filePath]) {
        if (this.fragmentDefinitions[filePath].source === extracted.source) {
          return false
        }
      }

      this.fragmentDefinitions[filePath] = {
        filePath,
        definition: extracted.definition,
        chunkName: (extracted.definition.chunkName || 'global') as any,
        componentName: 'BlokkliFragmentComponent_' + extracted.definition.name,
        source: extracted.source,
        fileSource,
      }
    }

    return true
  }

  /**
   * Extract the single text method calls.
   */
  extractSingle(
    code: string,
    filePath: string,
  ):
    | {
        definition:
          | ExtractedBlockDefinitionInput
          | ExtractedFragmentDefinitionInput
        source: string
      }
    | undefined {
    const pattern =
      `(${this.composableName}|${this.fragmentComposableName})` +
      '\\((\\{.+?\\})\\)'
    const rgx = new RegExp(pattern, 'gms')
    const source = rgx.exec(code)?.[2]
    if (source) {
      try {
        // eslint-disable-next-line no-eval
        const definition = eval(`(${source})`)
        return { definition, source }
      } catch (e) {
        // eslint-disable-next-line no-console
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
    const definitionDeclarations = Object.values(this.definitions).map((v) => {
      return `const ${v.componentName}: DefinitionItem = ${v.source}`
    }, {})

    const allDefinitions = Object.values(this.definitions).reduce<string[]>(
      (acc, v) => {
        const bundle = v.definition.bundle
        const renderFor = v.definition.renderFor
        if (renderFor) {
          const renderForList = Array.isArray(renderFor)
            ? renderFor
            : [renderFor]
          renderForList.forEach((entry) => {
            if ('parentBundle' in entry) {
              acc.push(
                `${bundle}__parent_block_${entry.parentBundle}: ${v.componentName}`,
              )
            } else {
              acc.push(
                `${bundle}__field_list_type_${entry.fieldList}: ${v.componentName}`,
              )
            }
          })
        } else {
          acc.push(`${bundle}: ${v.componentName}`)
        }
        return acc
        // return `${v.definition.bundle}: ${v.source}`
      },
      [],
    )

    const allFragmentDefinitions = Object.values(this.fragmentDefinitions).map(
      (v) => {
        return `${v.definition.name}: ${v.source}`
      },
    )

    const icons = Object.values(this.definitions).reduce<
      Record<string, string>
    >((acc, v) => {
      if (v.icon) {
        acc[v.definition.bundle] = v.icon
      }
      return acc
    }, {})

    const allFragmentNames = Object.values(this.fragmentDefinitions)
      .map((v) => `'${v.definition.name}'`)
      .join(' | ')

    return `import type { GlobalOptionsKey, ValidFieldListTypes, BlockBundleWithNested } from './generated-types'
import type { BlockDefinitionInput, BlockDefinitionOptionsInput, FragmentDefinitionInput } from '#blokkli/types'
export const globalOptions = ${JSON.stringify(globalOptions, null, 2)} as const

type DefinitionItem = BlockDefinitionInput<BlockDefinitionOptionsInput, GlobalOptionsKey[]>

${definitionDeclarations.join('\n')}

export const icons: Record<string, string> = ${JSON.stringify(icons)}

export const definitionsMap: Record<string, DefinitionItem> = {
  ${allDefinitions.join(',\n')}
}

export const fragmentDefinitionsMap: Record<string, FragmentDefinitionInput<BlockDefinitionOptionsInput, GlobalOptionsKey[]>> = {
  ${allFragmentDefinitions.join(',\n')}
}

export type BlokkliFragmentName = ${allFragmentNames || 'never'}

export const definitions: BlockDefinitionInput<any, GlobalOptionsKey[]>[] = Object.values(definitionsMap)
export const fragmentDefinitions: FragmentDefinitionInput<any, GlobalOptionsKey[]>[] = Object.values(fragmentDefinitionsMap)

/**
 * Get the block definition for the given field and parent context.
 */
export function getDefinition(bundle: string, fieldListType: ValidFieldListTypes, parentBundle?: BlockBundleWithNested): BlockDefinitionInput<Record<string, any>, GlobalOptionsKey[]>|undefined {
  const forFieldListType = bundle + '__field_list_type_' + fieldListType
  if (definitionsMap[forFieldListType]) {
    return definitionsMap[forFieldListType]
  }
  if (parentBundle) {
    const forParentBundle = bundle + '__parent_block_' + parentBundle
    if (definitionsMap[forParentBundle]) {
      return definitionsMap[forParentBundle]
    }
  }

  return definitionsMap[bundle]
}

/**
 * Get the definition of the default block component.
 */
export function getDefaultDefinition(bundle: string): BlockDefinitionInput<Record<string, any>, GlobalOptionsKey[]>|undefined {
  return definitionsMap[bundle]
}
export const getFragmentDefinition = (name: string): FragmentDefinitionInput<Record<string, any>, GlobalOptionsKey[]>|undefined => fragmentDefinitionsMap[name]
`
  }

  /**
   * Generate the options schema.
   */
  generateOptionsSchema(
    globalOptions: BlockDefinitionOptionsInput = {},
  ): string {
    const schema = Object.values(this.definitions).reduce<Record<string, any>>(
      (acc, v) => {
        acc[v.definition.bundle] = v.definition.options || {}

        const globalOptionKeys = v.definition.globalOptions || []

        globalOptionKeys.forEach((name) => {
          if (globalOptions[name]) {
            acc[v.definition.bundle][name] = globalOptions[name]
          }
        })

        return acc
      },
      {},
    )

    const sorted = sortObjectKeys(schema)
    return JSON.stringify(sorted, null, 2)
  }

  /**
   * Generate the default global options values template.
   */
  generateDefaultGlobalOptions(
    globalOptions: BlockDefinitionOptionsInput = {},
  ): string {
    const defaults = Object.entries(globalOptions).reduce<Record<string, any>>(
      (acc, [key, option]) => {
        if (option.default) {
          acc[key] = {
            default: option.default,
            type: option.type,
          }
        }
        return acc
      },
      {},
    )
    return `import type { BlockOptionDefinition } from '#blokkli/types/blokkOptions'

type GlobalOptionsDefaults = {
  type: BlockOptionDefinition['type']
  default: any
}

export const globalOptionsDefaults: Record<string, GlobalOptionsDefaults> = ${JSON.stringify(
      defaults,
      null,
      2,
    )} as const`
  }

  generateTypesTemplate(
    globalOptions: BlockDefinitionOptionsInput,
    chunkNames: string[],
    fieldListTypes: string[],
  ): string {
    const allDefintions: ExtractedBlockDefinitionInput[] = Object.values(
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
    const validGlobalOptions = Object.keys(globalOptions)
      .map((v) => {
        return `'${v}'`
      })
      .join(' | ')
    const blockBundlesWithNested = Object.values(this.definitions)
      .filter((v) => v.hasBlokkliField)
      .map((v) => {
        return `'${v.definition.bundle}'`
      })
      .join(' | ')
    const validBlockBundles = allDefintions
      .filter((v) => v.bundle !== 'from_library')
      .map((v) => {
        return `'${v.bundle}'`
      })
      .join(' | ')

    const possibleOptionTypes = Object.values(this.definitions)
      .filter((v) => v.definition.bundle !== 'from_library')
      .reduce<Record<string, string[]>>((acc, v) => {
        if (!acc[v.definition.bundle]) {
          acc[v.definition.bundle] = []
        }
        const definedOptions = v.definition
          .options as BlockDefinitionOptionsInput

        // Add global options used.
        const blockGlobalOptions: string[] = (v as any).globalOptions || []
        blockGlobalOptions.forEach((key) => {
          if (globalOptions[key]) {
            definedOptions[key] = globalOptions[key]
          }
        })

        const options = Object.entries(definedOptions || {})
          .map(([key, option]) => {
            if (option.type === 'text') {
              return `${key}: string | undefined`
            } else if (option.type === 'checkbox') {
              return `${key}: '1' | '0' | undefined`
            } else if (
              option.type === 'radios' ||
              option.type === 'checkboxes'
            ) {
              const possibleValues = Object.keys(option.options)
                .map((v) => `'${v}'`)
                .join(' | ')
              return `${key}: ${possibleValues} | undefined`
            }
          })
          .join('\n    ')

        acc[v.definition.bundle].push(
          `{
 ${options}
}`,
        )

        return acc
      }, {})

    const typedFieldListItems = Object.entries(possibleOptionTypes).map(
      ([bundle, options]) => {
        const typeName = `FieldListItem_${bundle}`
        const typeDefinition = `
type ${typeName} = {
  bundle: '${bundle}'
  options: ${options.join(' | ')}
}`
        return {
          typeName,
          typeDefinition,
        }
      },
    )

    return `
import type { FieldListItem } from "#blokkli/types"

export type ValidFieldListTypes = ${validFieldListTypes}

export type BlockBundle = ${validBlockBundles || `''`}

export type BlockBundleWithNested = ${blockBundlesWithNested || `''`}

export type ValidChunkNames = ${validChunkNames}

export type GlobalOptionsKey = ${validGlobalOptions || 'never'}

export type ValidGlobalConfigKeys = Array<GlobalOptionsKey>

${typedFieldListItems.map((v) => v.typeDefinition).join('\n\n')}

export type FieldListItemTyped = FieldListItem & (${typedFieldListItems
      .map((v) => v.typeName)
      .join(' | ')})
export type FieldListItemTypedArray = Array<FieldListItemTyped>
`
  }

  generateChunkGroupTemplate(chunkName: string) {
    return this.generateChunkGroup(
      chunkName,
      chunkName,
      { ...this.definitions, ...this.fragmentDefinitions },
      true,
    )
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
        acc['block_' + v.definition.bundle] = v.chunkName
      }
      return acc
    }, {})

    const nonGlobalFragmentChunkMapping = Object.values(
      this.fragmentDefinitions,
    ).reduce<Record<string, string>>((acc, v) => {
      if (v.chunkName !== 'global') {
        acc['fragment_' + v.definition.name] = v.chunkName
      }
      return acc
    }, {})

    return `
    import { defineAsyncComponent } from '#imports'
    ${this.generateChunkGroup('global', 'global', this.definitions)}
    ${this.generateChunkGroup(
      'global',
      'globalFragments',
      this.fragmentDefinitions,
    )}

const chunks: Record<string, () => Promise<any>> = {
  ${chunkImports.join(',\n  ')}
}

const chunkMapping: Record<string, string> = ${JSON.stringify(
      nonGlobalChunkMapping,
      null,
      2,
    )}

const fragmentChunkMapping: Record<string, string> = ${JSON.stringify(
      nonGlobalFragmentChunkMapping,
      null,
      2,
    )}

export function getBlokkliItemComponent(bundle: string, fieldListType?: string, parentBundle?: string): any {
  const forFieldListType = 'block_' + bundle + '__field_list_type_' + fieldListType
  if (global[forFieldListType]) {
    return global[forFieldListType]
  }
  if (parentBundle) {
    const forParentBundle = 'block_' + bundle + '__parent_block_' + parentBundle
    if (global[forParentBundle]) {
      return global[forParentBundle]
    }
  }
  const key = 'block_' + bundle
  if (global[key]) {
    return global[key]
  }
  const chunkName = chunkMapping[key]
  if (chunkName) {
    return defineAsyncComponent(() => chunks[chunkName]().then(chunk => {
      return chunk.default[key]
    }))
  }
}

export function getBlokkliFragmentComponent(name: string): any {
  const key = 'fragment_' + name
  if (globalFragments[key]) {
    return globalFragments[key]
  }
  const chunkName = fragmentChunkMapping[key]
  if (chunkName) {
    return defineAsyncComponent(() => chunks[chunkName]().then(chunk => {
      return chunk.default[key]
    }))
  }
}
`
  }

  /**
   * Generate the template.
   */
  generateChunkGroup(
    chunkName: string,
    exportName: string,
    inputDefinitions: Record<
      string,
      ExtractedDefinition | ExtractedFragmentDefinition
    >,
    addExport?: boolean,
  ): string {
    const definitions = Object.values(inputDefinitions).filter((v) => {
      return v.chunkName === chunkName
    })
    const imports = definitions.map((v) => {
      return `import ${v.componentName} from '${v.filePath}'`
    })
    const map = definitions.reduce<string[]>((acc, v) => {
      if ('bundle' in v.definition) {
        const bundle = v.definition.bundle
        const renderFor = v.definition.renderFor
        if (!renderFor) {
          acc.push(`block_${v.definition.bundle}: ${v.componentName}`)
        } else {
          const renderForList = Array.isArray(renderFor)
            ? renderFor
            : [renderFor]

          renderForList.forEach((entry) => {
            if ('parentBundle' in entry) {
              acc.push(
                `block_${bundle}__parent_block_${entry.parentBundle}: ${v.componentName}`,
              )
            } else {
              acc.push(
                `block_${bundle}__field_list_type_${entry.fieldList}: ${v.componentName}`,
              )
            }
          })
        }
      } else {
        acc.push(`fragment_${v.definition.name}: ${v.componentName}`)
      }
      return acc
    }, [])
    let content = `
${imports.join('\n')}

const ${exportName}: Record<string, any> = {
  ${map.join(',\n  ')}
}
`
    if (addExport) {
      content += `export default ${exportName}`
    }
    return content
  }
}
