import { resolveFiles } from '@nuxt/kit'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { CollectedFile, Collector } from '../../../build/Collector'
import type { TemplateDependency } from '../../../build/templates/defineTemplate'
import type { ModuleHelper } from '../../../build/ModuleHelper'
import { extractFirstStringArg } from '../../../build/helpers'

const DEFINITION = 'definition.ts'
const RENDER = 'render.vue'
const TOKENS = 'tokens.ts'

export type PrimitiveItem = {
  id: string
  importName: string
  definitionPath: string
  renderPath: string
}

class CollectedPrimitiveFile extends CollectedFile {
  public id: string | null = null
  public readonly kind: 'definition' | 'render' | 'tokens'
  public readonly dir: string

  constructor(filePath: string, fileContents: string) {
    super(filePath, fileContents)
    const base = path.basename(filePath)
    this.kind =
      base === DEFINITION ? 'definition' : base === RENDER ? 'render' : 'tokens'
    this.dir = path.dirname(filePath)
  }

  override async handleChange(): Promise<boolean> {
    if (this.kind === 'definition') {
      this.id =
        extractFirstStringArg(this.fileContents, [
          'defineCompositionPrimitive',
        ]) ?? null
    }
    return true
  }
}

/**
 * Collects the primitives (`primitives/<id>/definition.ts` and `render.vue`)
 * and the tokens (`tokens.ts`) of each composition directory.
 */
export class PrimitiveCollector extends Collector<CollectedPrimitiveFile> {
  protected override needsFileContents = true

  constructor(
    helper: ModuleHelper,
    private dirs: string[],
  ) {
    super(helper)
  }

  override async init(): Promise<void> {
    for (const dir of this.dirs) {
      try {
        await fs.promises.access(dir)
      } catch {
        continue
      }
      const files = await resolveFiles(
        dir,
        [`primitives/*/${DEFINITION}`, `primitives/*/${RENDER}`, TOKENS],
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
    if (base !== DEFINITION && base !== RENDER && base !== TOKENS) {
      return false
    }
    return this.dirs.some((dir) => filePath.startsWith(dir))
  }

  override createCollectedFile(
    filePath: string,
    fileContents: string,
  ): CollectedPrimitiveFile {
    return new CollectedPrimitiveFile(filePath, fileContents)
  }

  override getDependencyTypes(): TemplateDependency[] {
    return ['composition-primitives']
  }

  /** The last directory's tokens win: the project's come last. */
  getTokensPath(): string | null {
    let found: string | null = null
    for (const dir of this.dirs) {
      for (const file of this.files.values()) {
        if (file.kind === 'tokens' && file.dir === dir) {
          found = file.filePath
        }
      }
    }
    return found
  }

  getItems(): PrimitiveItem[] {
    const byDir = new Map<
      string,
      { definition?: CollectedPrimitiveFile; render?: CollectedPrimitiveFile }
    >()
    for (const file of this.files.values()) {
      if (file.kind === 'tokens') continue
      const entry = byDir.get(file.dir) ?? {}
      entry[file.kind] = file
      byDir.set(file.dir, entry)
    }

    // A primitive of a later directory replaces one with the same id.
    const byId = new Map<string, PrimitiveItem>()
    const order = (p: string) => this.dirs.findIndex((d) => p.startsWith(d))
    const entries = [...byDir.values()].sort(
      (a, b) =>
        order(a.definition?.filePath ?? '') -
        order(b.definition?.filePath ?? ''),
    )
    for (const { definition, render } of entries) {
      if (!definition?.id || !render) continue
      byId.set(definition.id, {
        id: definition.id,
        importName: 'primitive_' + definition.id.replace(/[^a-z0-9]/gi, '_'),
        definitionPath: definition.filePath,
        renderPath: render.filePath,
      })
    }
    return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
  }
}
