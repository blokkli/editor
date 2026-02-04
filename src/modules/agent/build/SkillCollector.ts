import { resolveFiles } from '@nuxt/kit'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { CollectedFile, Collector } from '../../../build/Collector'
import type { TemplateDependency } from '../../../build/templates/defineTemplate'
import type { ModuleHelper } from '../../../build/ModuleHelper'

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
  private skill: ExtractedSkill

  constructor(filePath: string, fileContents: string, importName: string) {
    super(filePath, fileContents)
    this.skill = {
      filePath,
      importName,
    }
  }

  getSkill(): ExtractedSkill {
    return this.skill
  }

  override async handleChange(): Promise<boolean> {
    // Skills don't need to parse file contents for now
    // All metadata is available at runtime via defineBlokkliAgentSkill
    return Promise.resolve(true)
  }
}

/**
 * Collects skill files from multiple directories.
 *
 * Skills are defined as TypeScript modules using defineBlokkliAgentSkill().
 * All .ts files in the skills directories (recursively) are collected.
 */
export class SkillCollector extends Collector<CollectedSkillFile> {
  protected override needsFileContents = false
  private skillsDirs: string[]

  constructor(helper: ModuleHelper, skillsDirs: string[]) {
    super(helper)
    this.skillsDirs = skillsDirs
  }

  /**
   * Initialize the collector by scanning for .ts files in all directories.
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

      const skillFiles = await resolveFiles(dir, ['**/*.ts'], {
        followSymbolicLinks: false,
      })

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
    return isInSkillsDir && filePath.endsWith('.ts')
  }

  override createCollectedFile(filePath: string): CollectedSkillFile {
    const fileName = path.basename(filePath, '.ts')
    const importName = this.toImportName(fileName)
    return new CollectedSkillFile(filePath, '', importName)
  }

  override getDependencyTypes(): TemplateDependency[] {
    return ['agent-skills']
  }

  /**
   * Convert a file name to a valid import name.
   */
  private toImportName(fileName: string): string {
    // Convert snake_case/kebab-case to PascalCase and add skill prefix
    const name = fileName
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
    return `skill${name}`
  }

  /**
   * Get all collected skills.
   */
  getSkills(): ExtractedSkill[] {
    return [...this.files.values()].map((v) => v.getSkill())
  }
}
