import { resolveFiles } from '@nuxt/kit'
import { CollectedFile, Collector } from './index'
import type { BlockDefinitionInput } from '../runtime/types'

const DEFINE_BLOKKLI = 'defineBlokkli'
const DEFINE_BLOKKLI_FRAGMENT = 'defineBlokkliFragment'

export class CollectedBlock extends CollectedFile {
  private icon: string | null = null
  private chunkName = 'global'
  private componentName: string
  private proxyComponent: string | null = null
  private definition: BlockDefinitionInput

  constructor(filePath: string) {
    super(filePath)
  }

  hasBlokkliField(): boolean {
    return (
      this.fileContents.includes('<BlokkliField') ||
      this.fileContents.includes('<blokkli-field')
    )
  }
}

export class BlockCollector extends Collector<CollectedBlock> {
  async init(srcFromModule: string) {
    const filesModule = await resolveFiles(srcFromModule, '*.svg')
    const filesApp = await resolveFiles(
      this.context.srcDir,
      '**/icon-blokkli-*.svg',
    )
    const allFiles = [...filesModule, ...filesApp]
    allFiles.forEach((filePath) => this.addFile(filePath))
  }

  build() {}

  generateTemplate() {
    return ''
  }
}
