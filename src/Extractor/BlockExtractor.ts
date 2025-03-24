import fs from 'node:fs'
import { relative } from 'pathe'
import path from 'node:path'
import type { BlockDefinitionOptionsInput } from '../runtime/types'
import { sortObjectKeys } from './../helpers'
import { defu } from 'defu'
import { falsy } from '../vitePlugin'
import type {
  BuildRelativeImports,
  ExtractedBlockDefinitionInput,
  ExtractedFragmentDefinition,
  ExtractedFragmentDefinitionInput,
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
