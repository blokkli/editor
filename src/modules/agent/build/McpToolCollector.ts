import { resolveFiles } from '@nuxt/kit'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { CollectedFile, Collector } from '../../../build/Collector'
import type { TemplateDependency } from '../../../build/templates/defineTemplate'
import type { ModuleHelper } from '../../../build/ModuleHelper'

export type ExtractedMcpTool = {
  filePath: string
  importName: string
}

/**
 * Collected MCP tool file.
 */
export class CollectedMcpToolFile extends CollectedFile {
  private tool: ExtractedMcpTool

  constructor(filePath: string, fileContents: string, importName: string) {
    super(filePath, fileContents)
    this.tool = {
      filePath,
      importName,
    }
  }

  getTool(): ExtractedMcpTool {
    return this.tool
  }

  override async handleChange(): Promise<boolean> {
    // Tools don't need to parse file contents for now
    // All metadata is available at runtime
    return Promise.resolve(true)
  }
}

/**
 * Collects MCP tool files from multiple directories.
 *
 * The collector finds tool files for import generation.
 * All tool metadata (name, description, schema) is available at runtime
 * and sent to the server dynamically via WebSocket.
 */
export class McpToolCollector extends Collector<CollectedMcpToolFile> {
  protected override needsFileContents = false
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

      const toolFiles = await resolveFiles(dir, ['*/index.ts'], {
        followSymbolicLinks: false,
      })

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
    return isInToolsDir && filePath.endsWith('/index.ts')
  }

  override createCollectedFile(filePath: string): CollectedMcpToolFile {
    const folderName = path.basename(path.dirname(filePath))
    const importName = this.toImportName(folderName)
    return new CollectedMcpToolFile(filePath, '', importName)
  }

  override getDependencyTypes(): TemplateDependency[] {
    return ['agent-mcp-tools']
  }

  /**
   * Convert a folder name to a valid import name.
   */
  private toImportName(fileName: string): string {
    // Convert snake_case to PascalCase and add tool prefix
    const name = fileName
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
    return `tool${name}`
  }

  /**
   * Get all collected tools.
   */
  getTools(): ExtractedMcpTool[] {
    return [...this.files.values()].map((v) => v.getTool())
  }
}
