import { resolveFiles } from '@nuxt/kit'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { CollectedFile, Collector } from '../../../build/Collector'
import type { TemplateDependency } from '../../../build/templates/defineTemplate'
import type { ModuleHelper } from '../../../build/ModuleHelper'

const PROMPT_COMPOSABLE = 'defineBlokkliAgentPrompt'

/**
 * Extracted prompt data for template generation.
 */
export type ExtractedPrompt = {
  filePath: string
  importName: string
}

/**
 * Collected prompt file.
 */
export class CollectedPromptFile extends CollectedFile {
  private prompt: ExtractedPrompt | null = null

  /**
   * Check if file contains the prompt composable and extract prompt data.
   */
  override async handleChange(): Promise<boolean> {
    if (!this.fileContents.includes(PROMPT_COMPOSABLE)) {
      this.prompt = null
      return true
    }

    const ext = path.extname(this.filePath)
    const fileName = path.basename(this.filePath, ext)
    const importName = toImportName(fileName)

    this.prompt = {
      filePath: this.filePath,
      importName,
    }

    return true
  }

  getPrompt(): ExtractedPrompt | null {
    return this.prompt
  }

  isValid(): boolean {
    return this.prompt !== null
  }
}

/**
 * Convert a file name to a valid import name.
 */
function toImportName(fileName: string): string {
  // Convert snake_case/kebab-case to PascalCase and add prompt prefix
  const name = fileName
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return `prompt${name}`
}

/**
 * Collects prompt files from multiple directories.
 *
 * Prompts are defined using defineBlokkliAgentPrompt().
 * Files (.ts or .js) containing this composable are collected.
 */
export class PromptCollector extends Collector<CollectedPromptFile> {
  protected override needsFileContents = true
  private promptsDirs: string[]

  constructor(helper: ModuleHelper, promptsDirs: string[]) {
    super(helper)
    this.promptsDirs = promptsDirs
  }

  /**
   * Initialize the collector by scanning for prompt files in all directories.
   */
  override async init(): Promise<void> {
    for (const dir of this.promptsDirs) {
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
    // No hooks for prompts currently
    return Promise.resolve()
  }

  override async applies(filePath: string): Promise<boolean> {
    const isInPromptsDir = this.promptsDirs.some((dir) =>
      filePath.startsWith(dir),
    )
    // Exclude .d.ts declaration files
    if (filePath.endsWith('.d.ts')) {
      return false
    }
    const hasValidExtension =
      filePath.endsWith('.ts') || filePath.endsWith('.js')
    return isInPromptsDir && hasValidExtension
  }

  override createCollectedFile(
    filePath: string,
    fileContents: string,
  ): CollectedPromptFile {
    return new CollectedPromptFile(filePath, fileContents)
  }

  override getDependencyTypes(): TemplateDependency[] {
    return ['agent-prompts']
  }

  /**
   * Get all collected prompts that are valid (contain defineBlokkliAgentPrompt).
   */
  getPrompts(): ExtractedPrompt[] {
    return [...this.files.values()]
      .filter((v) => v.isValid())
      .map((v) => v.getPrompt()!)
  }
}
