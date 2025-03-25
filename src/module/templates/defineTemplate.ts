import type { ModuleContext } from '../ModuleContext'
import type { ModuleHelper } from '../ModuleHelper'

type TemplateCallback = (context: ModuleContext) => string | Promise<string>

export type TemplateDependency =
  | 'icons'
  | 'features'
  | 'block-content'
  | 'block-path'
  | 'block-global-options'

type TemplateOptions = {
  dependencies?: TemplateDependency[]
  write?: boolean
}

export type ModuleCodeTemplate = {
  type: 'code'
  name: string
  buildCode: TemplateCallback
  buildTypes: TemplateCallback
  options: Required<TemplateOptions>
}

export type ModuleFileTemplate = {
  type: 'file'
  fileName: string
  build: TemplateCallback
  options: Required<TemplateOptions>
}

export type ModuleTemplate = ModuleCodeTemplate | ModuleFileTemplate

export function defineCodeTemplate(
  name: string,
  buildCode: TemplateCallback,
  buildTypes: TemplateCallback,
  options?: TemplateOptions,
): ModuleCodeTemplate {
  return {
    type: 'code',
    name,
    buildCode,
    buildTypes,
    options: {
      dependencies: options?.dependencies || [],
      write: !!options?.write,
    },
  }
}

export function defineFileTemplate(
  fileName: string,
  build: TemplateCallback,
): ModuleFileTemplate {
  return {
    type: 'file',
    fileName,
    build,
    options: {
      dependencies: [],
      write: true,
    },
  }
}

export function withHelper(
  cb: (helper: ModuleHelper) => ModuleTemplate | ModuleTemplate[],
): (helper: ModuleHelper) => ModuleTemplate | ModuleTemplate[] {
  return cb
}
