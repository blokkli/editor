import { addTemplate, addTypeTemplate } from '@nuxt/kit'
import type { IconCollector } from '../Collector/Icons'
import type { ModuleHelper } from './ModuleHelper'
import type {
  ModuleTemplate,
  TemplateDependency,
} from './templates/defineTemplate'
import type { FeatureCollector } from '../Collector/Features'
import type { ThemeData } from './ThemeData'
import type { BlockCollector } from '../Collector/Blocks'

export class ModuleContext {
  private templates: ModuleTemplate[] = []
  private templateContents: Map<string, string> = new Map()

  constructor(
    public helper: ModuleHelper,
    public icons: IconCollector,
    public features: FeatureCollector,
    public blocks: BlockCollector,
    public theme: ThemeData,
  ) {}

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
        write: true,
        getContents: () => this.getTemplateContents('code', template.name),
      })

      addTypeTemplate({
        filename: `blokkli/${template.name}.d.ts`,
        write: true,
        getContents: () => this.getTemplateContents('types', template.name),
      })
    } else {
      addTemplate({
        filename: `blokkli/${template.fileName}`,
        write: true,
        getContents: () => this.getTemplateContents('file', template.fileName),
      })
    }
  }
}
