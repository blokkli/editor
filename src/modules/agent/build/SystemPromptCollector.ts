import { resolveFiles } from '@nuxt/kit'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { CollectedFile, Collector } from '../../../build/Collector'
import type { TemplateDependency } from '../../../build/templates/defineTemplate'
import type { ModuleHelper } from '../../../build/ModuleHelper'

const SYSTEM_PROMPT_COMPOSABLE = 'defineBlokkliAgentSystemPrompt'

/**
 * Extracted system prompt data for template generation.
 */
export type ExtractedSystemPrompt = {
  filePath: string
  importName: string
}

/**
 * Collected system prompt file.
 */
export class CollectedSystemPromptFile extends CollectedFile {
  private systemPrompt: ExtractedSystemPrompt | null = null

  /**
   * Check if file contains the system prompt composable and extract data.
   */
  override async handleChange(): Promise<boolean> {
    if (!this.fileContents.includes(SYSTEM_PROMPT_COMPOSABLE)) {
      this.systemPrompt = null
      return true
    }

    const ext = path.extname(this.filePath)
    const fileName = path.basename(this.filePath, ext)
    const importName = toImportName(fileName)

    this.systemPrompt = {
      filePath: this.filePath,
      importName,
    }

    return true
  }

  getSystemPrompt(): ExtractedSystemPrompt | null {
    return this.systemPrompt
  }

  isValid(): boolean {
    return this.systemPrompt !== null
  }
}

/**
 * Convert a file name to a valid import name.
 */
function toImportName(fileName: string): string {
  // Convert snake_case/kebab-case to PascalCase and add systemPrompt prefix
  const name = fileName
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return `systemPrompt${name}`
}

/**
 * Collects system prompt files from multiple directories.
 *
 * System prompts are defined using defineBlokkliAgentSystemPrompt().
 * Files (.ts or .js) containing this composable are collected.
 */
export class SystemPromptCollector extends Collector<CollectedSystemPromptFile> {
  protected override needsFileContents = true
  private systemPromptDirs: string[]

  constructor(helper: ModuleHelper, systemPromptDirs: string[]) {
    super(helper)
    this.systemPromptDirs = systemPromptDirs
  }

  /**
   * Initialize the collector by scanning for system prompt files in all directories.
   */
  override async init(): Promise<void> {
    for (const dir of this.systemPromptDirs) {
      // Check if directory exists
      try {
        await fs.promises.access(dir)
      } catch {
        // Directory doesn't exist, skip it
        continue
      }

      // Find .ts and .js files, but exclude .d.ts declaration files
      const promptFiles = (
        await resolveFiles(dir, ['**/*.ts', '**/*.js'], {
          followSymbolicLinks: false,
        })
      ).filter((f) => !f.endsWith('.d.ts'))

      for (const filePath of promptFiles) {
        await this.addFile(filePath)
      }
    }
  }

  override runHooks(): Promise<void> {
    // No hooks for system prompts currently
    return Promise.resolve()
  }

  override async applies(filePath: string): Promise<boolean> {
    const isInDir = this.systemPromptDirs.some((dir) =>
      filePath.startsWith(dir),
    )
    // Exclude .d.ts declaration files
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
  ): CollectedSystemPromptFile {
    return new CollectedSystemPromptFile(filePath, fileContents)
  }

  override getDependencyTypes(): TemplateDependency[] {
    return ['agent-server']
  }

  /**
   * Get all collected system prompts that are valid (contain defineBlokkliAgentSystemPrompt).
   */
  getSystemPrompts(): ExtractedSystemPrompt[] {
    return [...this.files.values()]
      .filter((v) => v.isValid())
      .map((v) => v.getSystemPrompt()!)
  }
}
