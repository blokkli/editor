import { resolveFiles } from '@nuxt/kit'
import { CollectedFile, Collector } from './index'
import type { TemplateDependency } from '../templates/defineTemplate'
import micromatch from 'micromatch'
import type { ModuleHelper } from '../ModuleHelper'

export class IconCollector extends Collector {
  protected override needsFileContents = false
  private srcFromModule: string

  constructor(helper: ModuleHelper) {
    super(helper)
    this.srcFromModule = helper.resolvers.module.resolve('./runtime/icons')
  }

  override async init() {
    const srcFromModule =
      this.helper.resolvers.module.resolve('./runtime/icons')
    const filesModule = await resolveFiles(srcFromModule, '*.svg')
    const filesApp = await resolveFiles(
      this.helper.paths.srcDir,
      '**/icon-blokkli-*.svg',
    )
    const allFiles = [...filesModule, ...filesApp]
    await Promise.all(allFiles.map((filePath) => this.addFile(filePath)))
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
