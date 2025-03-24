import { resolveFiles } from '@nuxt/kit'
import { CollectedFile, Collector } from './index'
import type { TemplateDependency } from '../module/templates/defineTemplate'
import * as micromatch from 'micromatch'
import type { ModuleHelper } from '../module/ModuleHelper'
import type { AdapterMethods, FeatureDefinition } from '../runtime/types'
import { falsy } from '../vitePlugin'

export type ExtractedFeatureDefinition = {
  id: string
  componentName: string
  componentPath: string
  definition: FeatureDefinition<AdapterMethods[]>
}

export class CollectedFeatureFile extends CollectedFile {
  private definition: ExtractedFeatureDefinition | null = null
  private composableName = 'defineBlokkliFeature'

  getDefinition(): ExtractedFeatureDefinition | null {
    return this.definition
  }

  override async handleChange(): Promise<boolean> {
    const pattern = this.composableName + '\\((\\{.+?\\})\\)'
    const rgx = new RegExp(pattern, 'gms')
    const source = rgx.exec(this.fileContents)?.[1]
    if (source) {
      try {
        const definition = eval(`(${source})`)
        const regex = /\/Features\/([^/]+)\//
        const componentName = this.filePath.match(regex)?.[1] || ''
        // @TODO: Check if there was a change (compare source).
        this.definition = {
          id: definition.id,
          componentName,
          componentPath: this.filePath,
          definition,
        }
      } catch (e) {
        console.error(
          `Failed to parse component "${this.filePath}": ${this.composableName} does not contain a valid object literal. No variables and methods are allowed inside ${this.composableName}().`,
          e,
        )
      }
    }
    return Promise.resolve(true)
  }
}

export class FeatureCollector extends Collector<CollectedFeatureFile> {
  protected override needsFileContents = true

  private srcFromModule: string

  constructor(helper: ModuleHelper) {
    super(helper)
    this.srcFromModule = helper.resolvers.module.resolve(
      './runtime/components/Edit/Features',
    )
  }

  public getFeatures(): ExtractedFeatureDefinition[] {
    return [...this.files.values()].map((v) => v.getDefinition()).filter(falsy)
  }

  override async init() {
    // @TODO: Add way to disable features.

    const builtinFeatures = await resolveFiles(
      this.srcFromModule,
      ['*/index.vue'],
      {
        followSymbolicLinks: false,
      },
    )

    const customFeatures = this.helper.options.featureImports
      ? await resolveFiles(
          this.helper.paths.srcDir,
          this.helper.options.featureImports,
          {
            followSymbolicLinks: false,
          },
        )
      : []

    return Promise.all(
      [...builtinFeatures, ...customFeatures].map((v) => this.addFile(v)),
    )
  }

  public override createCollectedFile(
    filePath: string,
    fileContents = '',
  ): CollectedFeatureFile {
    return new CollectedFeatureFile(filePath, fileContents)
  }

  public override applies(filePath: string): Promise<boolean> {
    return Promise.resolve(
      filePath.startsWith(this.srcFromModule) ||
        micromatch.isMatch(filePath, 'icon-blokkli-*.svg'),
    )
  }

  public isEnabled(id: string): boolean {
    // @TODO
    return true
  }

  override getDependencyTypes(): TemplateDependency[] {
    return ['features']
  }
}
