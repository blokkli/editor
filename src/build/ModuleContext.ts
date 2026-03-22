import { addTemplate } from '@nuxt/kit'
import type { IconCollector } from './Collector/Icons'
import type { ModuleHelper } from './ModuleHelper'
import type {
  ModuleTemplate,
  TemplateDependency,
  TemplateContext,
} from './templates/defineTemplate'
import type { FeatureCollector } from './Collector/Features'
import type { ThemeData } from './ThemeData'
import type { BlockCollector } from './Collector/Blocks'
import type { Collector } from './Collector'

const WRITE = false

export interface AdapterExtensionDefinition {
  namespace: string
  path: string
}

export interface ComplexOptionTypeDefinition {
  id: string
  typeName: string
  typePath: string
  editorComponentPath: string
  editorButtonLabel: string
  editorIcon: string
  editorTitle?: string
}

export class ModuleContext {
  private templates: ModuleTemplate[] = []
  private templateContents: Map<string, string> = new Map()
  private adapterExtensions: AdapterExtensionDefinition[] = []
  private featureFragments: Set<string> = new Set()
  private complexOptionTypes: Map<string, ComplexOptionTypeDefinition> =
    new Map()
  private cssFiles: string[] = []
  private additionalIcons: string[] = []
  public collectors: Collector[] = []

  constructor(
    public helper: ModuleHelper,
    public icons: IconCollector,
    public features: FeatureCollector,
    public blocks: BlockCollector,
    public theme: ThemeData,
  ) {}

  addCSS(filePath: string): void {
    this.cssFiles.push(filePath)
  }

  getCSSFiles(): string[] {
    return this.cssFiles
  }

  addIcon(...names: string[]): void {
    this.additionalIcons.push(...names)
  }

  getAdditionalIcons(): string[] {
    return this.additionalIcons
  }

  addFeatureFragment(name: string) {
    if (this.featureFragments.has(name)) {
      throw new Error(`A feature fragment with name "${name}" already exists.`)
    }
    this.featureFragments.add(name)
  }

  getFeatureFragmentNames(): string[] {
    return [...this.featureFragments.values()]
  }

  registerComplexOptionType(def: ComplexOptionTypeDefinition): void {
    if (this.complexOptionTypes.has(def.id)) {
      throw new Error(
        `A complex option type with id "${def.id}" already exists.`,
      )
    }
    this.complexOptionTypes.set(def.id, def)
  }

  getComplexOptionTypes(): ComplexOptionTypeDefinition[] {
    return [...this.complexOptionTypes.values()]
  }

  registerAdapterExtension(namespace: string, path: string): void {
    if (this.adapterExtensions.some((e) => e.namespace === namespace)) {
      throw new Error(`Duplicate adapter extension namespace: ${namespace}`)
    }
    this.adapterExtensions.push({ namespace, path })
  }

  getAdapterExtensions(): AdapterExtensionDefinition[] {
    return this.adapterExtensions
  }

  addCollector(collector: Collector) {
    this.collectors.push(collector)
  }

  private getTemplateContents(
    type: 'code' | 'types' | 'file',
    name: string,
  ): string {
    const contents = this.templateContents.get(type + name)
    if (contents === undefined) {
      throw new Error(
        `Failed to get contents for template "${name}" of type ${type}`,
      )
    }

    return contents
  }

  private setTemplateContents(
    type: 'code' | 'types' | 'file',
    name: string,
    contents: string,
  ) {
    this.templateContents.set(type + name, contents.trim())
  }

  public async generateTemplates(dependencies?: TemplateDependency[]) {
    for (const template of this.templates) {
      // Skip the template if we only need to generate templates for one dependency.
      if (dependencies?.length) {
        const shouldUpdate = dependencies.some((v) =>
          template.options.dependencies.includes(v),
        )
        if (!shouldUpdate) {
          continue
        }
      }

      if (template.type === 'code') {
        this.setTemplateContents(
          'code',
          template.name,
          await template.buildCode(this),
        )
        this.setTemplateContents(
          'types',
          template.name,
          await template.buildTypes(this),
        )
      } else {
        this.setTemplateContents(
          'file',
          template.fileName,
          await template.build(this),
        )
      }
    }
  }

  addTemplate(template: ModuleTemplate) {
    this.templates.push(template)
    const context = template.options.context

    if (template.type === 'code') {
      const resolvedTemplate = addTemplate({
        filename: `blokkli/${template.name}.js`,
        write: template.options.write || WRITE,
        getContents: () => this.getTemplateContents('code', template.name),
      })

      // For server templates, inline for Nitro build
      if (context === 'server' || context === 'both') {
        this.inlineForNitro(resolvedTemplate.dst)
      }

      this.addTypeTemplate(
        `blokkli/${template.name}.d.ts`,
        () => {
          const lines = this.getTemplateContents('types', template.name)
            .trim()
            .split('\n')

          const imports: string[] = []
          const declarations: string[] = []

          for (const line of lines) {
            // Handle both regular imports (import x from 'y') and side-effect imports (import 'y')
            if (line.startsWith('import ')) {
              imports.push(line)
            } else {
              declarations.push(line)
            }
          }

          return `${imports.join('\n')}

declare module '#blokkli-build/${template.name}' {
  ${declarations.join('\n  ')}
}`
        },
        context,
      )
    } else {
      const filename = template.fileName.startsWith('/')
        ? template.fileName
        : `blokkli/${template.fileName}`

      if (filename.endsWith('.d.ts')) {
        this.addTypeTemplate(
          filename as `${string}.d.ts`,
          () => this.getTemplateContents('file', template.fileName),
          context,
        )
      } else {
        const resolvedTemplate = addTemplate({
          filename,
          write: true,
          getContents: () =>
            this.getTemplateContents('file', template.fileName),
        })

        // For server templates, inline for Nitro build
        if (context === 'server' || context === 'both') {
          this.inlineForNitro(resolvedTemplate.dst)
        }
      }
    }
  }

  /**
   * Add a template path to Nitro's externals.inline for server-side usage.
   * @see https://github.com/nuxt/nuxt/issues/28995
   */
  private inlineForNitro(path: string) {
    const nuxt = this.helper.nuxt
    nuxt.options.nitro.externals ||= {}
    nuxt.options.nitro.externals.inline ||= []
    nuxt.options.nitro.externals.inline.push(path)
    nuxt.options.build.transpile.push(path)
  }

  /**
   * Register a type template without adding to globalTypeFiles.
   *
   * Uses addTemplate instead of addTypeTemplate to avoid Vue compiler-sfc
   * issue where exported types from globalTypeFiles cannot be resolved.
   * @see https://github.com/nuxt/nuxt/issues/33694
   */
  private addTypeTemplate(
    filename: `${string}.d.ts`,
    getContents: () => string,
    context: TemplateContext = 'app',
  ) {
    const resolvedTemplate = addTemplate({
      filename,
      write: true,
      getContents,
    })

    const forApp = context === 'app' || context === 'both'
    const forServer = context === 'server' || context === 'both'

    // Manually register type references (what addTypeTemplate does),
    // but without adding to globalTypeFiles which breaks Vue's compiler-sfc.
    if (forApp) {
      this.helper.nuxt.hook('prepare:types', (payload) => {
        payload.references ||= []
        payload.references.push({ path: resolvedTemplate.dst })
      })
    }

    if (forServer) {
      this.helper.nuxt.hook('nitro:prepare:types', (payload) => {
        payload.references ||= []
        payload.references.push({ path: resolvedTemplate.dst })
      })
    }
  }
}
