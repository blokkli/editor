import { resolveFiles } from '@nuxt/kit'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { CollectedFile, Collector } from '../../../build/Collector'
import type { TemplateDependency } from '../../../build/templates/defineTemplate'
import type { ModuleHelper } from '../../../build/ModuleHelper'
import { extractStringProperty } from '../../../build/helpers'

export type ExtractedItem = {
  filePath: string
  importName: string
  name?: string
}

export type AgentCollectorOptions = {
  /** The composable name to search for in file contents. */
  composable: string
  /** Prefix for generated import names, e.g. 'skill' produces 'skillMyFile'. */
  importPrefix: string
  /** Template dependency type. */
  dependency: TemplateDependency
  /** Directories to scan. */
  dirs: string[]
}

/**
 * Convert a file name to a valid import name with the given prefix.
 */
function toImportName(prefix: string, fileName: string): string {
  const name = fileName
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return `${prefix}${name}`
}

/**
 * Collected agent file.
 */
class CollectedAgentFile extends CollectedFile {
  private item: ExtractedItem | null = null

  constructor(
    filePath: string,
    fileContents: string,
    private composable: string,
    private importPrefix: string,
  ) {
    super(filePath, fileContents)
  }

  override async handleChange(): Promise<boolean> {
    if (!this.fileContents.includes(this.composable)) {
      this.item = null
      return true
    }

    const ext = path.extname(this.filePath)
    const fileName = path.basename(this.filePath, ext)
    // For index files (e.g. add_blocks/index.ts), use the parent directory name.
    const baseName =
      fileName === 'index'
        ? path.basename(path.dirname(this.filePath))
        : fileName
    const importName = toImportName(this.importPrefix, baseName)

    const name = extractStringProperty(
      this.fileContents,
      [this.composable],
      'name',
    )

    this.item = {
      filePath: this.filePath,
      importName,
      name,
    }

    return true
  }

  getItem(): ExtractedItem | null {
    return this.item
  }

  isValid(): boolean {
    return this.item !== null
  }
}

/**
 * Generic collector for agent-related files (tools, skills, prompts, system prompts).
 *
 * Scans directories for .ts/.js files containing a specific composable call
 * and collects them for import generation.
 */
export class AgentCollector extends Collector<CollectedAgentFile> {
  protected override needsFileContents = true
  private options: AgentCollectorOptions

  constructor(helper: ModuleHelper, options: AgentCollectorOptions) {
    super(helper)
    this.options = options
  }

  override async init(): Promise<void> {
    for (const dir of this.options.dirs) {
      try {
        await fs.promises.access(dir)
      } catch {
        continue
      }

      const files = (
        await resolveFiles(dir, ['**/*.ts', '**/*.js'], {
          followSymbolicLinks: false,
        })
      ).filter((f) => !f.endsWith('.d.ts'))

      for (const filePath of files) {
        await this.addFile(filePath)
      }
    }
  }

  override runHooks(): Promise<void> {
    return Promise.resolve()
  }

  override async applies(filePath: string): Promise<boolean> {
    const isInDir = this.options.dirs.some((dir) => filePath.startsWith(dir))
    if (filePath.endsWith('.d.ts')) {
      return false
    }
    const hasValidExtension =
      filePath.endsWith('.ts') || filePath.endsWith('.js')
    return isInDir && hasValidExtension
  }

  override createCollectedFile(
    filePath: string,
    fileContents: string,
  ): CollectedAgentFile {
    return new CollectedAgentFile(
      filePath,
      fileContents,
      this.options.composable,
      this.options.importPrefix,
    )
  }

  override getDependencyTypes(): TemplateDependency[] {
    return [this.options.dependency]
  }

  /**
   * Get all collected items that are valid (contain the composable).
   */
  getItems(): ExtractedItem[] {
    return [...this.files.values()]
      .filter((v) => v.isValid())
      .map((v) => v.getItem()!)
  }

  /**
   * Get the extracted `name` values from all valid items.
   */
  getNames(): string[] {
    return this.getItems()
      .filter((item) => item.name !== undefined)
      .map((item) => item.name!)
  }
}
