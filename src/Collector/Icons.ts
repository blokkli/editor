import { resolveFiles } from '@nuxt/kit'
import { Collector } from './index'
import type { TemplateDependency } from '../module/templates/defineTemplate'
import * as micromatch from 'micromatch'
import type { ModuleHelper } from '../module/ModuleHelper'

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

  public override applies(filePath: string): Promise<boolean> {
    return Promise.resolve(
      filePath.startsWith(this.srcFromModule) ||
        micromatch.isMatch(filePath, 'icon-blokkli-*.svg'),
    )
  }

  override getDependencyTypes(): TemplateDependency[] {
    return ['icons']
  }
}
