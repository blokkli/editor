import type { WatchEvent } from 'nuxt/schema'
import type { ModuleHelper } from '../ModuleHelper'
import type { TemplateDependency } from '../templates/defineTemplate'
import type { IconCollector } from './Icons'
import type { ValidationInterface } from '../ValidationInterface'
import type { CollectedFeatureFile } from './Features'
import type { CollectedBlockFile } from './Blocks'

type AlterHookContext<K extends string, T extends CollectedFile> = {
  [P in K]: T[]
}

export interface ModuleHooks {
  'blokkli:alter-features': (
    ctx: AlterHookContext<'features', CollectedFeatureFile>,
  ) => void | Promise<void>
  'blokkli:alter-icons': (
    ctx: AlterHookContext<'icons', CollectedFile>,
  ) => void | Promise<void>
  'blokkli:alter-blocks': (
    ctx: AlterHookContext<'blocks', CollectedBlockFile>,
  ) => void | Promise<void>
}

declare module '@nuxt/schema' {
  // oxlint-disable-next-line
  interface NuxtHooks extends ModuleHooks {}
}

export type HandleWatchEventResult = {
  hasChanged: boolean
}

export type ValidationSeverity = 'error' | 'warning'

export type ValidationError = {
  message: string
  severity?: ValidationSeverity
}

export class CollectedFile {
  constructor(
    public readonly filePath: string,
    public fileContents: string,
  ) {}

  async handleChange(_helper: ModuleHelper): Promise<boolean> {
    return Promise.resolve(true)
  }

  /**
   * Validate the collected file and return any errors.
   * Override this method in subclasses to add validation logic.
   */
  validate(_icons: IconCollector): ValidationError[] {
    return []
  }
}

export abstract class Collector<
  T extends CollectedFile = CollectedFile,
> implements ValidationInterface {
  files: Map<string, T>
  protected needsFileContents: boolean = true

  constructor(protected helper: ModuleHelper) {
    this.files = new Map()
  }

  public abstract init(): Promise<any>

  public abstract runHooks(): Promise<any>

  public abstract applies(filePath: string): Promise<boolean>

  public abstract createCollectedFile(
    filePath: string,
    fileContents?: string,
  ): T

  public abstract getDependencyTypes(): TemplateDependency[]

  async addFile(filePath: string): Promise<void> {
    if (this.needsFileContents) {
      const contents = await this.helper.fileCache.read(filePath)
      const file = this.createCollectedFile(filePath, contents.toString())
      await file.handleChange(this.helper)
      this.files.set(filePath, file)
    } else {
      const file = this.createCollectedFile(filePath)
      await file.handleChange(this.helper)
      this.files.set(filePath, file)
    }
  }

  protected async handleAdd(filePath: string): Promise<boolean> {
    const applies = await this.applies(filePath)
    if (applies) {
      await this.addFile(filePath)
      return true
    }

    return false
  }

  protected async handleChange(filePath: string): Promise<boolean> {
    const applies = await this.applies(filePath)
    if (!applies) {
      // It's possible the file applied before but not anymore.
      // In this case we want to remove it.
      return this.handleUnlink(filePath)
    }

    const file = this.files.get(filePath)
    if (!file) {
      return false
    }

    if (this.needsFileContents) {
      const contents = await this.helper.fileCache.read(filePath)
      file.fileContents = contents.toString()
      return await file.handleChange(this.helper)
    }

    return true
  }

  protected handleUnlink(filePath: string): Promise<boolean> | boolean {
    if (this.files.has(filePath)) {
      this.files.delete(filePath)
      return true
    }

    return false
  }

  private handleAddDir() {
    return false
  }

  private handleUnlinkDir(folderPath: string) {
    const allKeys = [...this.files.keys()]
    const toRemove = allKeys.filter((filePath) => filePath.includes(folderPath))
    if (toRemove.length) {
      toRemove.forEach((key) => this.files.delete(key))
      return true
    }

    return false
  }

  async handleWatchEvent(
    event: WatchEvent,
    filePath: string,
  ): Promise<HandleWatchEventResult> {
    let hasChanged = false
    if (event === 'add') {
      hasChanged = await this.handleAdd(filePath)
    } else if (event === 'change') {
      hasChanged = await this.handleChange(filePath)
    } else if (event === 'unlink') {
      hasChanged = await this.handleUnlink(filePath)
    } else if (event === 'addDir') {
      hasChanged = this.handleAddDir()
    } else if (event === 'unlinkDir') {
      hasChanged = this.handleUnlinkDir(filePath)
    }

    return { hasChanged }
  }

  /**
   * Validate all collected files and log any errors/warnings to the console.
   * @returns true if there are validation errors (not warnings), false otherwise.
   */
  validate(icons: IconCollector): boolean {
    const allIssues: Array<{ filePath: string; issues: ValidationError[] }> = []

    for (const file of this.files.values()) {
      const issues = file.validate(icons)
      if (issues.length > 0) {
        allIssues.push({ filePath: file.filePath, issues })
      }
    }

    if (allIssues.length === 0) {
      return false
    }

    // Separate errors and warnings
    const errors: Array<{ filePath: string; issues: ValidationError[] }> = []
    const warnings: Array<{ filePath: string; issues: ValidationError[] }> = []

    for (const { filePath, issues } of allIssues) {
      const fileErrors = issues.filter((i) => i.severity !== 'warning')
      const fileWarnings = issues.filter((i) => i.severity === 'warning')

      if (fileErrors.length > 0) {
        errors.push({ filePath, issues: fileErrors })
      }
      if (fileWarnings.length > 0) {
        warnings.push({ filePath, issues: fileWarnings })
      }
    }

    // Log warnings
    if (warnings.length > 0) {
      const lines = warnings.flatMap(({ filePath, issues }) => [
        `  ${filePath}:`,
        ...issues.map((e) => `    - ${e.message}`),
      ])
      this.helper.logger.warn(
        `blökkli validation warnings:\n${lines.join('\n')}`,
      )
    }

    // Log errors
    if (errors.length > 0) {
      const lines = errors.flatMap(({ filePath, issues }) => [
        `  ${filePath}:`,
        ...issues.map((e) => `    - ${e.message}`),
      ])
      this.helper.logger.error(
        `blökkli validation errors:\n${lines.join('\n')}`,
      )
      return true
    }

    return false
  }
}
