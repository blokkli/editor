import { resolveFiles } from '@nuxt/kit'
import { CollectedFile, Collector, type HandleWatchEventResult } from './index'
import type { TemplateDependency } from '../templates/defineTemplate'
import { readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname } from 'node:path'
import micromatch from 'micromatch'
import type { ModuleHelper } from '../ModuleHelper'
import type { WatchEvent } from 'nuxt/schema'

export class IconCollector extends Collector {
  protected override needsFileContents = false
  private srcFromModule: string
  private validMaterialIconNames: Set<string>
  private validFileIconNames: Set<string> = new Set()

  constructor(helper: ModuleHelper) {
    super(helper)
    this.srcFromModule = helper.resolvers.module.resolve(
      './runtime/editor/icons/svg',
    )
    this.validMaterialIconNames = this.loadValidMaterialIconNames()
  }

  private updateValidFileIconNames() {
    const names = [...this.files.values()].map((file) => {
      return basename(file.filePath, '.svg').toLowerCase()
    })
    this.validFileIconNames = new Set(names)
  }

  /**
   * Load all valid Material Symbols icon names from the package.
   */
  private loadValidMaterialIconNames(): Set<string> {
    const require = createRequire(import.meta.url)
    // Resolve the path to the package by finding a known file.
    const packagePath = dirname(
      require.resolve('@material-symbols/svg-600/rounded/search.svg'),
    )
    const files = readdirSync(packagePath)

    const iconNames = files
      .filter((file) => file.endsWith('.svg'))
      .map((file) => 'bk_mdi_' + file.replace('.svg', ''))

    return new Set(iconNames)
  }

  /**
   * Check if a given string is a valid Material Symbols icon name.
   *
   * @param name - The icon name to check (should include `bk_mdi_` prefix).
   *
   * @returns True if the icon name is valid.
   */
  public isValidIconName(name: string): boolean {
    return (
      this.isValidMaterialIconName(name) || this.validFileIconNames.has(name)
    )
  }

  /**
   * Check if a given string is a valid Material Symbols icon name.
   *
   * @param name - The icon name to check (should include `bk_mdi_` prefix).
   *
   * @returns True if the icon name is valid.
   */
  public isValidMaterialIconName(name: string): boolean {
    return this.validMaterialIconNames.has(name)
  }

  /**
   * Get all valid Material Symbols icon names.
   *
   * @returns An array of all valid icon names (with `bk_mdi_` prefix).
   */
  public getValidMaterialIconNames(): string[] {
    return Array.from(this.validMaterialIconNames)
  }

  override async handleWatchEvent(
    event: WatchEvent,
    filePath: string,
  ): Promise<HandleWatchEventResult> {
    const result = await super.handleWatchEvent(event, filePath)
    if (result.hasChanged) {
      this.updateValidFileIconNames()
    }
    return result
  }

  override async init() {
    const filesModule = await resolveFiles(this.srcFromModule, '*.svg')
    const filesApp = await resolveFiles(
      this.helper.paths.srcDir,
      '**/icon-blokkli-*.svg',
    )

    // Special "hack" when building module playground: We need to include the
    // icons from the playground itself.
    const filesPlayground = this.helper.isModuleBuild
      ? await resolveFiles('./playground', '**/icon-blokkli-*.svg')
      : []
    const allFiles = [...filesModule, ...filesApp, ...filesPlayground]
    await Promise.all(allFiles.map((filePath) => this.addFile(filePath)))
    this.updateValidFileIconNames()
  }

  public runHooks() {
    return this.helper.nuxt.hooks.callHook('blokkli:alter-icons', {
      icons: [...this.files.values()],
    })
  }

  public override applies(filePath: string): Promise<boolean> {
    return Promise.resolve(
      filePath.startsWith(this.srcFromModule) ||
        micromatch.isMatch(filePath, 'icon-blokkli-*.svg'),
    )
  }

  override getDependencyTypes(): TemplateDependency[] {
    return ['icons']
  }

  public createCollectedFile(
    filePath: string,
    fileContents = '',
  ): CollectedFile {
    return new CollectedFile(filePath, fileContents)
  }
}
