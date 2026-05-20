import { resolveFiles } from '@nuxt/kit'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { CollectedFile, Collector } from '../../../build/Collector'
import type { TemplateDependency } from '../../../build/templates/defineTemplate'
import type { ModuleHelper } from '../../../build/ModuleHelper'
import { extractFirstStringArg } from '../../../build/helpers'

const DEFINITION_FILENAMES = ['definition.ts', 'definition.js']
const RENDER_FILENAME = 'render.vue'
const ILLUSTRATION_FILENAME = 'illustration.vue'

function isDefinitionFile(filePath: string): boolean {
  return DEFINITION_FILENAMES.includes(path.basename(filePath))
}

export type ChartTypeItem = {
  /** Chart-type id, extracted from `defineChartType('<id>', ...)`. */
  id: string
  /** Sanitized id, used in template imports. */
  importName: string
  /** Absolute path to `definition.ts`. */
  definitionPath: string
  /** Absolute path to `render.vue`. */
  renderPath: string
  /**
   * Absolute path to `illustration.vue`, if the chart-type folder has one.
   * Used by the editor's chart-type picker to render a preview card.
   */
  illustrationPath: string | null
}

export type ChartTypeCollectorOptions = {
  /** Directories to scan. Each is expected to contain `<typeId>/` subfolders. */
  dirs: string[]
}

function toImportName(rawId: string): string {
  // Sanitize: collapse non-word chars, capitalize segments, prefix to avoid
  // identifier collisions with reserved words.
  const cleaned = rawId
    .split(/[^a-z0-9]/i)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
  return `chartType${cleaned || 'Anonymous'}`
}

class CollectedChartTypeFile extends CollectedFile {
  /**
   * The chart-type id, parsed only for `definition.ts` files. Render and
   * illustration files leave this `null` — they're tracked only so the
   * watcher rebuilds the templates on add/change/unlink.
   */
  public id: string | null = null
  public readonly isDefinition: boolean
  public readonly isRender: boolean
  public readonly isIllustration: boolean
  public readonly typeDir: string

  constructor(filePath: string, fileContents: string) {
    super(filePath, fileContents)
    const base = path.basename(filePath)
    this.isDefinition = isDefinitionFile(filePath)
    this.isRender = base === RENDER_FILENAME
    this.isIllustration = base === ILLUSTRATION_FILENAME
    this.typeDir = path.dirname(filePath)
  }

  override async handleChange(): Promise<boolean> {
    if (this.isDefinition) {
      this.id =
        extractFirstStringArg(this.fileContents, ['defineChartType']) ?? null
    }
    return true
  }
}

/**
 * Collects chart-type folders (each containing `definition.ts` +
 * `render.vue`). Mirrors the AgentCollector pattern but groups two
 * sibling files into one item per directory.
 */
export class ChartTypeCollector extends Collector<CollectedChartTypeFile> {
  protected override needsFileContents = true
  private options: ChartTypeCollectorOptions

  constructor(helper: ModuleHelper, options: ChartTypeCollectorOptions) {
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

      const files = await resolveFiles(
        dir,
        [
          ...DEFINITION_FILENAMES.map((name) => `**/${name}`),
          `**/${RENDER_FILENAME}`,
          `**/${ILLUSTRATION_FILENAME}`,
        ],
        { followSymbolicLinks: false },
      )

      for (const filePath of files) {
        await this.addFile(filePath)
      }
    }
  }

  override runHooks(): Promise<void> {
    return Promise.resolve()
  }

  override async applies(filePath: string): Promise<boolean> {
    const base = path.basename(filePath)
    if (
      !isDefinitionFile(filePath) &&
      base !== RENDER_FILENAME &&
      base !== ILLUSTRATION_FILENAME
    ) {
      return false
    }
    return this.options.dirs.some((dir) => filePath.startsWith(dir))
  }

  override createCollectedFile(
    filePath: string,
    fileContents: string,
  ): CollectedChartTypeFile {
    return new CollectedChartTypeFile(filePath, fileContents)
  }

  override getDependencyTypes(): TemplateDependency[] {
    return ['chart-types']
  }

  /**
   * Returns one item per directory where both `definition.ts` (with an
   * extracted id) and `render.vue` exist.
   */
  getItems(): ChartTypeItem[] {
    const byDir = new Map<
      string,
      {
        definition?: CollectedChartTypeFile
        render?: CollectedChartTypeFile
        illustration?: CollectedChartTypeFile
      }
    >()
    for (const file of this.files.values()) {
      const slot = byDir.get(file.typeDir) ?? {}
      if (file.isDefinition) slot.definition = file
      if (file.isRender) slot.render = file
      if (file.isIllustration) slot.illustration = file
      byDir.set(file.typeDir, slot)
    }

    const items: ChartTypeItem[] = []
    const seenIds = new Set<string>()
    for (const { definition, render, illustration } of byDir.values()) {
      if (!definition || !render || !definition.id) continue
      const id = definition.id
      if (seenIds.has(id)) {
        this.helper.logger.warn(
          `Duplicate chart-type id "${id}" at ${definition.filePath}. Skipping.`,
        )
        continue
      }
      seenIds.add(id)
      items.push({
        id,
        importName: toImportName(id),
        definitionPath: definition.filePath,
        renderPath: render.filePath,
        illustrationPath: illustration?.filePath ?? null,
      })
    }

    // Stable order (by id) so template output is deterministic across runs.
    items.sort((a, b) => a.id.localeCompare(b.id))
    return items
  }
}
