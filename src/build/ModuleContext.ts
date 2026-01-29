import { addTemplate } from '@nuxt/kit'
import type { IconCollector } from './Collector/Icons'
import type { ModuleHelper } from './ModuleHelper'
import type {
  ModuleTemplate,
  TemplateDependency,
} from './templates/defineTemplate'
import type { FeatureCollector } from './Collector/Features'
import type { ThemeData } from './ThemeData'
import type { BlockCollector } from './Collector/Blocks'

const WRITE = false

export interface AdapterExtensionDefinition {
  namespace: string
  path: string
}

export class ModuleContext {
  private templates: ModuleTemplate[] = []
  private templateContents: Map<string, string> = new Map()
  private adapterExtensions: AdapterExtensionDefinition[] = []

  constructor(
    public helper: ModuleHelper,
    public icons: IconCollector,
    public features: FeatureCollector,
    public blocks: BlockCollector,
    public theme: ThemeData,
  ) {}

  registerAdapterExtension(namespace: string, path: string): void {
    if (this.adapterExtensions.some((e) => e.namespace === namespace)) {
      throw new Error(`Duplicate adapter extension namespace: ${namespace}`)
    }
    this.adapterExtensions.push({ namespace, path })
  }

  getAdapterExtensions(): AdapterExtensionDefinition[] {
    return this.adapterExtensions
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

    if (template.type === 'code') {
      addTemplate({
        filename: `blokkli/${template.name}.js`,
        write: template.options.write || WRITE,
        getContents: () => this.getTemplateContents('code', template.name),
      })

      this.addTypeTemplate(`blokkli/${template.name}.d.ts`, () => {
        const lines = this.getTemplateContents('types', template.name)
          .trim()
          .split('\n')

        const imports: string[] = []
        const declarations: string[] = []

        for (const line of lines) {
          if (line.startsWith('import ') && line.includes(' from ')) {
            imports.push(line)
          } else {
            declarations.push(line)
          }
        }

        return `${imports.join('\n')}

declare module '#blokkli-build/${template.name}' {
  ${declarations.join('\n  ')}
}`
      })
    } else {
      const filename = template.fileName.startsWith('/')
        ? template.fileName
        : `blokkli/${template.fileName}`

      if (filename.endsWith('.d.ts')) {
        this.addTypeTemplate(filename as any, () =>
          this.getTemplateContents('file', template.fileName),
        )
      } else {
        addTemplate({
          filename,
          write: true,
          getContents: () =>
            this.getTemplateContents('file', template.fileName),
        })
      }
    }
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
  ) {
    const resolvedTemplate = addTemplate({
      filename,
      write: true,
      getContents,
    })

    // Manually register type references (what addTypeTemplate does),
    // but without adding to globalTypeFiles which breaks Vue's compiler-sfc.
    this.helper.nuxt.hook('prepare:types', (payload) => {
      payload.references ||= []
      payload.references.push({ path: resolvedTemplate.dst })
    })
  }
}
