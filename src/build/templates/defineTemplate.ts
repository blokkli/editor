import type { ModuleContext } from '../ModuleContext'
import type { ModuleHelper } from '../ModuleHelper'

type TemplateCallback = (context: ModuleContext) => string | Promise<string>

export type TemplateDependency =
  | 'icons'
  | 'features'
  | 'block-content'
  | 'block-path'
  | 'block-global-options'
  | 'agent-mcp-tools'
  | 'agent-server'
  | 'agent-prompts'
  | 'module-css'
  | 'chart-types'

/**
 * Where the template should be available:
 * - 'app': Only in app context (default)
 * - 'server': Only in server/Nitro context (will be inlined for Nitro build)
 * - 'both': Available in both contexts
 */
export type TemplateContext = 'app' | 'server' | 'both'

type TemplateOptions = {
  dependencies?: TemplateDependency[]
  write?: boolean
  /**
   * The context where this template should be available.
   * Server templates will be inlined for Nitro build.
   * @default 'app'
   */
  context?: TemplateContext
}

export type ModuleCodeTemplate = {
  type: 'code'
  name: string
  buildCode: TemplateCallback
  buildTypes: TemplateCallback
  options: Required<TemplateOptions> & { context: TemplateContext }
}

export type ModuleFileTemplate = {
  type: 'file'
  fileName: string
  build: TemplateCallback
  options: Required<TemplateOptions> & { context: TemplateContext }
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
      context: options?.context || 'app',
    },
  }
}

export function defineFileTemplate(
  fileName: string,
  build: TemplateCallback,
  options?: TemplateOptions,
): ModuleFileTemplate {
  return {
    type: 'file',
    fileName,
    build,
    options: {
      dependencies: options?.dependencies || [],
      write: options?.write ?? true,
      context: options?.context || 'app',
    },
  }
}

export function withHelper(
  cb: (helper: ModuleHelper) => ModuleTemplate | ModuleTemplate[],
): (helper: ModuleHelper) => ModuleTemplate | ModuleTemplate[] {
  return cb
}
