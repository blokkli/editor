import { resolveFiles } from '@nuxt/kit'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { CollectedFile, Collector } from '../../../build/Collector'
import type { TemplateDependency } from '../../../build/templates/defineTemplate'
import type { ModuleHelper } from '../../../build/ModuleHelper'

const TOOL_COMPOSABLE = 'defineBlokkliAgentTool'

export type ExtractedMcpTool = {
  filePath: string
  importName: string
}

/**
 * Collected MCP tool file.
 */
export class CollectedMcpToolFile extends CollectedFile {
  private tool: ExtractedMcpTool | null = null

  /**
   * Check if file contains the tool composable and extract tool data.
   */
  override async handleChange(): Promise<boolean> {
    if (!this.fileContents.includes(TOOL_COMPOSABLE)) {
      this.tool = null
      return true
    }

    const folderName = path.basename(path.dirname(this.filePath))
    const importName = toImportName(folderName)

    this.tool = {
      filePath: this.filePath,
      importName,
    }

    return true
  }

  getTool(): ExtractedMcpTool | null {
    return this.tool
  }

  isValid(): boolean {
    return this.tool !== null
  }
}

/**
 * Convert a folder name to a valid import name.
 */
function toImportName(folderName: string): string {
  // Convert snake_case/kebab-case to PascalCase and add tool prefix
  const name = folderName
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return `tool${name}`
}

/**
 * Collects MCP tool files from multiple directories.
 *
 * Tools are defined using defineBlokkliAgentTool() in index.ts or index.js files.
 * The collector finds tool files for import generation.
 * All tool metadata (name, description, schema) is available at runtime.
 */
export class McpToolCollector extends Collector<CollectedMcpToolFile> {
  protected override needsFileContents = true
  private toolsDirs: string[]

  constructor(helper: ModuleHelper, toolsDirs: string[]) {
    super(helper)
    this.toolsDirs = toolsDirs
  }

  /**
   * Initialize the collector by scanning for tool files in all directories.
   */
  override async init(): Promise<void> {
    for (const dir of this.toolsDirs) {
      // Check if directory exists
      try {
        await fs.promises.access(dir)
      } catch {
        // Directory doesn't exist, skip it
        continue
      }

      // Find index.ts and index.js files, but exclude .d.ts declaration files
      const toolFiles = (
        await resolveFiles(dir, ['*/index.ts', '*/index.js'], {
          followSymbolicLinks: false,
        })
      ).filter((f) => !f.endsWith('.d.ts'))

      for (const filePath of toolFiles) {
        await this.addFile(filePath)
      }
    }
  }

  override runHooks(): Promise<void> {
    // No hooks for MCP tools currently
    return Promise.resolve()
  }

  override async applies(filePath: string): Promise<boolean> {
    const isInToolsDir = this.toolsDirs.some((dir) => filePath.startsWith(dir))
    // Exclude .d.ts declaration files
    if (filePath.endsWith('.d.ts')) {
      return false
    }
    const isIndexFile =
      filePath.endsWith('/index.ts') || filePath.endsWith('/index.js')
    return isInToolsDir && isIndexFile
  }

  override createCollectedFile(
    filePath: string,
    fileContents: string,
  ): CollectedMcpToolFile {
    return new CollectedMcpToolFile(filePath, fileContents)
  }

  override getDependencyTypes(): TemplateDependency[] {
    return ['agent-mcp-tools']
  }

  /**
   * Get all collected tools that are valid (contain defineBlokkliAgentTool).
   */
  getTools(): ExtractedMcpTool[] {
    return [...this.files.values()]
      .filter((v) => v.isValid())
      .map((v) => v.getTool()!)
  }
}
