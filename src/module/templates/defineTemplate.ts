import type { ModuleContext } from '../ModuleContext'

type TemplateCallback = (context: ModuleContext) => string | Promise<string>

export type TemplateDependency = 'icons' | 'features'

type TemplateOptions = {
  dependencies?: TemplateDependency[]
}

export type ModuleTemplate = {
  name: string
  buildCode: TemplateCallback
  buildTypes: TemplateCallback
  options: Required<TemplateOptions>
}

export function defineTemplate(
  name: string,
  buildCode: TemplateCallback,
  buildTypes: TemplateCallback,
  options?: TemplateOptions,
): ModuleTemplate {
  return {
    name,
    buildCode,
    buildTypes,
    options: {
      dependencies: options?.dependencies || [],
    },
  }
}
