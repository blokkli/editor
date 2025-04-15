import { resolveFiles } from '@nuxt/kit'
import { CollectedFile, Collector } from './index'
import type { TemplateDependency } from '../module/templates/defineTemplate'
import micromatch from 'micromatch'
import type { ModuleHelper } from '../module/ModuleHelper'
import type { AdapterMethods, FeatureDefinition } from '../runtime/types'
import { extractObjectLiteral, parseTsObject, falsy } from '../helpers'

export type ExtractedFeatureDefinition = {
  id: string
  componentName: string
  componentPath: string
  definition: FeatureDefinition<AdapterMethods[]>
  definitionSource: string
}

export class CollectedFeatureFile extends CollectedFile {
  private definition: ExtractedFeatureDefinition | null = null
  private composableName = 'defineBlokkliFeature'
  private enabled = true
  private objectLiteral: string | undefined = undefined

  getDefinition(): ExtractedFeatureDefinition | null {
    return this.definition
  }

  override async handleChange(): Promise<boolean> {
    const objectLiteral = extractObjectLiteral(this.fileContents, [
      this.composableName,
    ])
    if (this.objectLiteral === objectLiteral) {
      return false
    }

    this.objectLiteral = objectLiteral

    if (!this.objectLiteral) {
      return false
    }

    try {
      const { object: definition, source } = parseTsObject<FeatureDefinition>(
        this.objectLiteral,
      )
      const regex = /\/Features\/([^/]+)\//
      const componentName = this.filePath.match(regex)?.[1] || ''
      this.definition = {
        id: definition.id,
        componentName,
        componentPath: this.filePath,
        definition,
        definitionSource: source,
      }
    } catch (e) {
      console.error(
        `Failed to parse component "${this.filePath}": ${this.composableName} does not contain a valid object literal. No variables and methods are allowed inside ${this.composableName}().`,
        e,
      )
    }
    return Promise.resolve(true)
  }

  public isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Disable the feature.
   */
  public disable() {
    this.enabled = false
  }
}

export class FeatureCollector extends Collector<CollectedFeatureFile> {
  protected override needsFileContents = true

  private disabledFeatures = new Set<string>()

  private srcFromModule: string

  constructor(helper: ModuleHelper) {
    super(helper)
    this.srcFromModule = helper.resolvers.module.resolve(
      './runtime/components/Edit/Features',
    )
  }

  public getEnabledFeatures(): ExtractedFeatureDefinition[] {
    return [...this.files.values()]
      .filter((v) => v.isEnabled())
      .map((v) => v.getDefinition())
      .filter(falsy)
      .filter((v) => !this.disabledFeatures.has(v.id))
  }

  override async init() {
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

    await Promise.all(
      [...builtinFeatures, ...customFeatures].map((v) => this.addFile(v)),
    )

    const features = [...this.files.values()]

    if (!this.helper.options.enableThemeEditor) {
      const themeFeature = features.find(
        (v) => v.getDefinition()?.id === 'theme',
      )
      if (themeFeature) {
        themeFeature.disable()
      }
    }
  }

  public runHooks() {
    return this.helper.nuxt.hooks.callHook('blokkli:alter-features', {
      features: [...this.files.values()],
    })
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

  override getDependencyTypes(): TemplateDependency[] {
    return ['features']
  }

  public disableFeature(id: string) {
    this.disabledFeatures.add(id)
  }
}
