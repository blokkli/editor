import { resolveFiles } from '@nuxt/kit'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { CollectedFile, Collector } from '../../../build/Collector'
import type { TemplateDependency } from '../../../build/templates/defineTemplate'
import type { ModuleHelper } from '../../../build/ModuleHelper'

const SKILL_COMPOSABLE = 'defineBlokkliAgentSkill'

/**
 * Extracted skill data for template generation.
 */
export type ExtractedSkill = {
  filePath: string
  importName: string
}

/**
 * Collected skill file.
 */
export class CollectedSkillFile extends CollectedFile {
  private skill: ExtractedSkill | null = null

  constructor(filePath: string, fileContents: string) {
    super(filePath, fileContents)
  }

  /**
   * Check if file contains the skill composable and extract skill data.
   */
  override async handleChange(): Promise<boolean> {
    if (!this.fileContents.includes(SKILL_COMPOSABLE)) {
      this.skill = null
      return true
    }

    const ext = path.extname(this.filePath)
    const fileName = path.basename(this.filePath, ext)
    const importName = toImportName(fileName)

    this.skill = {
      filePath: this.filePath,
      importName,
    }

    return true
  }

  getSkill(): ExtractedSkill | null {
    return this.skill
  }

  isValid(): boolean {
    return this.skill !== null
  }
}

/**
 * Convert a file name to a valid import name.
 */
function toImportName(fileName: string): string {
  // Convert snake_case/kebab-case to PascalCase and add skill prefix
  const name = fileName
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return `skill${name}`
}

/**
 * Collects skill files from multiple directories.
 *
 * Skills are defined using defineBlokkliAgentSkill().
 * Files (.ts or .js) containing this composable are collected.
 */
export class SkillCollector extends Collector<CollectedSkillFile> {
  protected override needsFileContents = true
  private skillsDirs: string[]

  constructor(helper: ModuleHelper, skillsDirs: string[]) {
    super(helper)
    this.skillsDirs = skillsDirs
  }

  /**
   * Initialize the collector by scanning for skill files in all directories.
   */
  override async init(): Promise<void> {
    for (const dir of this.skillsDirs) {
      // Check if directory exists
      try {
        await fs.promises.access(dir)
      } catch {
        // Directory doesn't exist, skip it
        continue
      }

      // Find .ts and .js files, but exclude .d.ts declaration files
      const skillFiles = (
        await resolveFiles(dir, ['**/*.ts', '**/*.js'], {
          followSymbolicLinks: false,
        })
      ).filter((f) => !f.endsWith('.d.ts'))

      for (const filePath of skillFiles) {
        await this.addFile(filePath)
      }
    }
  }

  override runHooks(): Promise<void> {
    // No hooks for skills currently
    return Promise.resolve()
  }

  override async applies(filePath: string): Promise<boolean> {
    const isInSkillsDir = this.skillsDirs.some((dir) =>
      filePath.startsWith(dir),
    )
    // Exclude .d.ts declaration files
    if (filePath.endsWith('.d.ts')) {
      return false
    }
    const hasValidExtension =
      filePath.endsWith('.ts') || filePath.endsWith('.js')
    return isInSkillsDir && hasValidExtension
  }

  override createCollectedFile(
    filePath: string,
    fileContents: string,
  ): CollectedSkillFile {
    return new CollectedSkillFile(filePath, fileContents)
  }

  override getDependencyTypes(): TemplateDependency[] {
    return ['agent-skills']
  }

  /**
   * Get all collected skills that are valid (contain defineBlokkliAgentSkill).
   */
  getSkills(): ExtractedSkill[] {
    return [...this.files.values()]
      .filter((v) => v.isValid())
      .map((v) => v.getSkill()!)
  }
}
