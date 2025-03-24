import fs from 'node:fs'
import { relative } from 'pathe'
import path from 'node:path'
import type { BlockDefinitionOptionsInput } from '../runtime/types'
import { sortObjectKeys } from './../helpers'
import { defu } from 'defu'
import { falsy } from '../vitePlugin'
import {
  BK_HIDDEN_GLOBALLY,
  BK_VISIBLE_LANGUAGES,
} from './../runtime/helpers/symbols'
import type {
  BuildRelativeImports,
  ExtractedBlockDefinitionInput,
  ExtractedDefinition,
  ExtractedFragmentDefinition,
  ExtractedFragmentDefinitionInput,
  GetBundlePropsType,
  GetBundlePropsTypeResult,
} from '../module/types'

/**
 * Service to handle text extractions across multiple files.
 */
export default class BlockExtractor {
  definitions: Record<string, ExtractedDefinition | undefined> = {}
  fragmentDefinitions: Record<string, ExtractedFragmentDefinition | undefined> =
    {}
  isBuild = false
  composableName: string
  fragmentComposableName: string
  buildDir: string
  imports: BuildRelativeImports

  constructor(
    isBuild = false,
    buildDir: string,
    imports: BuildRelativeImports,
  ) {
    this.isBuild = isBuild
    this.buildDir = buildDir
    this.imports = imports
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
    } catch {
      // Noop, the icon is optional.
    }
  }

  async getContextComponent(
    baseComponentPath: string,
    name: string,
  ): Promise<string | undefined> {
    const folder = path.dirname(baseComponentPath)
    const componentPath = path.join(folder, `/${name}.vue`)
    try {
      await fs.promises.access(componentPath, fs.constants.F_OK)
      return componentPath
    } catch {
      // Noop, the component is optional.
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
        this.definitions[filePath] = undefined
        return true
      }

      if (this.fragmentDefinitions[filePath]) {
        this.fragmentDefinitions[filePath] = undefined
        return true
      }

      return false
    }

    if ('bundle' in extracted.definition) {
      const icon = await this.getIcon(filePath)
      const proxyComponent = await this.getContextComponent(filePath, 'proxy')
      const diffComponent = await this.getContextComponent(filePath, 'diff')

      if (
        this.definitions[filePath] &&
        this.definitions[filePath]?.source === extracted.source
      ) {
        return false
      }

      const extension = path.extname(filePath)
      const componentFileName = path.basename(filePath, extension)

      this.definitions[filePath] = {
        filePath,
        definition: extracted.definition,
        icon,
        proxyComponent,
        diffComponent,
        chunkName: this.isBuild
          ? ((extracted.definition.chunkName || 'global') as any)
          : 'global',
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
      if (
        this.fragmentDefinitions[filePath] &&
        this.fragmentDefinitions[filePath]?.source === extracted.source
      ) {
        return false
      }

      this.fragmentDefinitions[filePath] = {
        filePath,
        definition: extracted.definition,
        chunkName: this.isBuild
          ? ((extracted.definition.chunkName || 'global') as any)
          : 'global',
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
        const definition = eval(`(${source})`)
        return { definition, source }
      } catch (e) {
        console.error(
          `Failed to parse component "${filePath}": ${this.composableName} does not contain a valid object literal. No variables and methods are allowed inside ${this.composableName}().`,
          e,
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
   * Generate the template for the block item options used for runtime (e.g. not during editing).
   */
  generateRuntimeOptionsTemplate(
    globalOptions: BlockDefinitionOptionsInput = {},
  ): string {
    const bundles = Object.values(this.definitions)
      .filter(falsy)
      .reduce<Record<string, any>>((acc, definition) => {
        if (definition.definition.renderFor) {
          return acc
        }
        const bundle = definition.definition.bundle
        const optionDefinitions = Object.entries(
          definition.definition.options || {},
        )

        const options: Record<string, any> = {}

        if (definition.definition.globalOptions) {
          definition.definition.globalOptions.forEach((name) => {
            const option = globalOptions[name]
            options[name] = [option.type, option.default]
          })
        }

        optionDefinitions.forEach(([name, option]) => {
          options[name] = [option.type, option.default]
        })

        if (Object.values(options).length) {
          acc[bundle] = options
        }

        return acc
      }, {})

    function getOptionTypes(definition: ExtractedBlockDefinitionInput) {
      const definedOptions = (definition.options ||
        {}) as BlockDefinitionOptionsInput

      // Add global options used.
      const blockGlobalOptions: string[] = definition.globalOptions || []
      blockGlobalOptions.forEach((key) => {
        if (globalOptions[key]) {
          definedOptions[key] = globalOptions[key]
        }
      })

      return Object.entries(definedOptions || {}).map(([key, option]) => {
        if (option.type === 'text') {
          return `${key}: string`
        } else if (option.type === 'checkbox') {
          return `${key}: boolean`
        } else if (option.type === 'checkboxes') {
          const possibleValues =
            Object.keys(option.options)
              .map((v) => `'${v}'`)
              .join(' | ') || 'string'
          return `${key}: Array<${possibleValues}>`
        } else if (option.type === 'radios') {
          const possibleValues =
            Object.keys(option.options)
              .map((v) => `'${v}'`)
              .join(' | ') || 'string'
          return `${key}: ${possibleValues}`
        } else if (option.type === 'color') {
          return key + ': ' + '`#${string}`'
        } else if (option.type === 'range' || option.type === 'number') {
          return `${key}: number`
        }
      })
    }

    const runtimeMappedOptionTypes = Object.values(this.definitions)
      .filter(falsy)
      .map((definition) => {
        if (definition.definition.renderFor) {
          return null
        }
        const bundle = definition.definition.bundle
        const options = getOptionTypes(definition.definition).join('\n    ')
        if (!options) {
          return `  ${bundle}: {}`
        }
        return `  ${bundle}: {
    ${options}
  }`
      })
      .filter(falsy)
      .join(',\n')

    return `
import type { BlockOptionDefinition } from '${this.imports.TYPES_BLOKK_OPTIONS}'

export type RuntimeBlockOptionArray = {
  [T in BlockOptionDefinition as T['type']]: [T['type'], T['default']]
}[BlockOptionDefinition['type']]

export type RuntimeBlockOptions = {
${runtimeMappedOptionTypes}
}

export const BLOCK_OPTIONS: Record<string, Record<string, RuntimeBlockOptionArray>> = ${JSON.stringify(bundles, null, 2)}
`
  }

  generateEditComponents(): string {
    const buildContextComponents = (
      name: keyof Pick<ExtractedDefinition, 'diffComponent' | 'proxyComponent'>,
    ) => {
      const proxyComponents = Object.values(this.definitions).reduce<
        Record<string, string>
      >((acc, v) => {
        if (v?.[name]) {
          acc[v.definition.bundle] = v[name]
        }

        return acc
      }, {})

      const imports = Object.entries(proxyComponents)
        .map(([bundle, proxyComponentPath]) => {
          return `import ${name}_${bundle} from '${this.toBuildRelativePath(proxyComponentPath)}'`
        })
        .join('\n')

      const maps = Object.keys(proxyComponents)
        .map((bundle) => {
          return `'${bundle}': ${name}_${bundle}`
        })
        .join(',  \n')

      return {
        imports,
        maps,
      }
    }

    const proxy = buildContextComponents('proxyComponent')
    const diff = buildContextComponents('diffComponent')

    return `
${proxy.imports}
${diff.imports}

const PROXY_COMPONENTS: Record<string, any> = {
  ${proxy.maps}
}

const DIFF_COMPONENTS: Record<string, any> = {
  ${diff.maps}
}

export function getBlokkliItemProxyComponent(bundle: string): any {
  return PROXY_COMPONENTS[bundle]
}

export function getBlokkliItemDiffComponent(bundle: string): any {
  return DIFF_COMPONENTS[bundle]
}
`
  }

  /**
   * Generate the options schema.
   */
  generateOptionsSchema(
    globalOptions: BlockDefinitionOptionsInput = {},
  ): string {
    const schema = Object.values(this.definitions)
      .filter(falsy)
      .reduce<Record<string, any>>((acc, v) => {
        const existing = acc[v.definition.bundle] || {}
        acc[v.definition.bundle] = defu(existing, v.definition.options || {})

        const globalOptionKeys: string[] = v.definition.globalOptions || []

        globalOptionKeys.forEach((name) => {
          if (globalOptions[name]) {
            acc[v.definition.bundle][name] = globalOptions[name]
          }
        })

        return acc
      }, {})

    const sorted = sortObjectKeys(schema)
    return JSON.stringify(sorted, null, 2)
  }

  getBundlesWithGlobalOptions(key: string) {
    return Object.values(this.definitions)
      .map((definition) => {
        const globalOptions = definition?.definition.globalOptions as string[]
        if (definition && globalOptions && globalOptions.includes(key)) {
          return definition.definition.bundle
        }
      })
      .filter(falsy)
  }

  /**
   * Generate the default global options values template.
   */
  generateDefaultGlobalOptions(
    globalOptions: BlockDefinitionOptionsInput = {},
  ): string {
    const defaults = Object.entries(globalOptions).reduce<Record<string, any>>(
      (acc, [key, option]) => {
        if (option.default !== undefined && option.default !== null) {
          acc[key] = {
            default: option.default,
            type: option.type,
          }
        }
        return acc
      },
      {},
    )
    return `import type { BlockOptionDefinition } from '${this.imports.TYPES_BLOKK_OPTIONS}'

type GlobalOptionsDefaults = {
  type: BlockOptionDefinition['type']
  default: any
}

export const bundlesWithVisibleLanguage: string[] = ${JSON.stringify(this.getBundlesWithGlobalOptions(BK_VISIBLE_LANGUAGES))}
export const bundlesWithHiddenGlobally: string[] = ${JSON.stringify(this.getBundlesWithGlobalOptions(BK_HIDDEN_GLOBALLY))}

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
    getBundlePropsType?: GetBundlePropsType,
  ): string {
    const allDefintions: ExtractedBlockDefinitionInput[] = Object.values(
      this.definitions,
    )
      .map((v) => v?.definition)
      .filter(falsy)

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
      .filter(falsy)
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

    function getOptionTypes(definition: ExtractedBlockDefinitionInput) {
      const definedOptions = (definition.options ||
        {}) as BlockDefinitionOptionsInput

      // Add global options used.
      const blockGlobalOptions: string[] = definition.globalOptions || []
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
          } else if (option.type === 'radios' || option.type === 'checkboxes') {
            return `${key}: string | undefined`
          } else if (option.type === 'color') {
            return `${key}: string | undefined`
          } else if (option.type === 'range' || option.type === 'number') {
            return `${key}: number | string | undefined`
          }
        })
        .join('\n    ')

      return `{
    ${options}
  }`
    }

    const propTypeImports: Record<
      string,
      { bundle: string; typeName: string }[]
    > = {}
    const typedFieldListItems: { typeName: string; typeDefinition: string }[] =
      []

    const definitions = Object.entries(this.definitions)

    const mappedGetBundlePropsType = (
      bundle: string,
      definition: ExtractedDefinition,
    ): GetBundlePropsTypeResult | null => {
      if (bundle === 'from_library' || bundle === 'blokkli_fragment') {
        return {
          typeName: 'Props',
          from: definition.filePath,
        }
      } else if (getBundlePropsType) {
        return getBundlePropsType(bundle, definition)
      }

      return null
    }

    for (let i = 0; i < definitions.length; i++) {
      const [_, definition] = definitions[i]
      if (!definition) {
        continue
      }

      // Skip components renderFor components, because we only want to generate
      // option and prop types for the "main" component.
      if (definition.definition.renderFor) {
        continue
      }

      const bundle = definition.definition.bundle
      const options = getOptionTypes(definition.definition)
      const generatedTypeName = `FieldListItem_${bundle}`
      const lines: string[] = [`  bundle: '${bundle}'`, `options: ${options}`]
      const bundlePropsType = mappedGetBundlePropsType(bundle, definition)
      if (bundlePropsType) {
        const { typeName, from } = bundlePropsType

        if (!propTypeImports[from]) {
          propTypeImports[from] = []
        }

        propTypeImports[from].push({ bundle, typeName })

        lines.push(`props: Bundle_${bundle}_Props`)
      }

      const typeDefinition = `
type ${generatedTypeName} = {
${lines.join('\n  ')}
}`
      typedFieldListItems.push({
        typeName: generatedTypeName,
        typeDefinition,
      })
    }

    const propTypeImportStatements = Object.entries(propTypeImports)
      .map(([from, items]) => {
        const imports = items
          .map((v) => {
            return `${v.typeName} as Bundle_${v.bundle}_Props`
          })
          .join(',\n  ')
        const importPath = this.toBuildRelativePath(from)
        return `import type {
  ${imports}
} from '${importPath}'`
      })
      .join('\n')

    return `
${propTypeImportStatements}
import type { FieldListItem } from "${this.imports.TYPES}"

export type ValidFieldListTypes = ${validFieldListTypes}

export type BlockBundle = ${validBlockBundles || `''`}

export type BlockBundleWithNested = ${blockBundlesWithNested || `''`}

export type ValidChunkNames = ${validChunkNames}

export type GlobalOptionsKey = ${validGlobalOptions || 'never'}

export type ValidGlobalConfigKeys = Array<GlobalOptionsKey>

${typedFieldListItems.map((v) => v.typeDefinition).join('\n\n')}

export type FieldListItemTyped = Omit<FieldListItem, 'props'> & (${typedFieldListItems
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
        return `${chunkName}: () => import('./chunk-${chunkName}')`
      })

    const nonGlobalChunkMapping = Object.values(this.definitions).reduce<
      Record<string, string>
    >((acc, v) => {
      if (v && v.chunkName !== 'global') {
        acc['block_' + v.definition.bundle] = v.chunkName
      }
      return acc
    }, {})

    const nonGlobalFragmentChunkMapping = Object.values(
      this.fragmentDefinitions,
    ).reduce<Record<string, string>>((acc, v) => {
      if (v && v.chunkName !== 'global') {
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

function componentOrFunction(component: any) {
  if (typeof component === 'object') {
    return component
  }

  return defineAsyncComponent(() => component())
}

export function getBlokkliItemComponent(bundle: string, fieldListType?: string, parentBundle?: string): any {
  const forFieldListType = 'block_' + bundle + '__field_list_type_' + fieldListType
  if (global[forFieldListType]) {
    return componentOrFunction(global[forFieldListType])
  }
  if (parentBundle) {
    const forParentBundle = 'block_' + bundle + '__parent_block_' + parentBundle
    if (global[forParentBundle]) {
      return componentOrFunction(global[forParentBundle])
    }
  }
  const key = 'block_' + bundle
  if (global[key]) {
    return componentOrFunction(global[key])
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
    return componentOrFunction(globalFragments[key])
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

  toBuildRelativePath(path: string): string {
    if (!path.startsWith('/')) {
      return path
    }
    return relative(this.buildDir, path)
  }

  /**
   * Generate the template.
   */
  generateChunkGroup(
    chunkName: string,
    exportName: string,
    inputDefinitions: Record<
      string,
      ExtractedDefinition | ExtractedFragmentDefinition | undefined
    >,
    addExport?: boolean,
  ): string {
    const definitions = Object.values(inputDefinitions)
      .filter((v) => {
        return v?.chunkName === chunkName
      })
      .filter(falsy)
    const imports = definitions.map((v) => {
      if (this.isBuild) {
        // In the build bundle the component can directly be imported.
        return `import ${v.componentName} from '${this.toBuildRelativePath(v.filePath)}'`
      } else {
        // In dev mode, we always want to async import the component. This is
        // the only way to prevent circular dependencies which would trigger a
        // full refresh whenever a block component with a <BlokkliField> is
        // updated, esentially breaking HMR.
        return `const ${v.componentName} = () => import('${this.toBuildRelativePath(v.filePath)}')`
      }
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
            } else if ('fieldList' in entry) {
              acc.push(
                `block_${bundle}__field_list_type_${entry.fieldList}: ${v.componentName}`,
              )
            } else if ('fieldListType' in entry) {
              acc.push(
                `block_${bundle}__field_list_type_${entry.fieldListType}: ${v.componentName}`,
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
