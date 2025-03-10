import type { WatchEvent } from 'nuxt/schema'
import type { ModuleContext } from '../module/types'

export class CollectedFile {
  filePath: string
  fileContents = ''
  needsUpdate = false

  constructor(filePath: string) {
    this.filePath = filePath
  }

  setNeedsUpdate() {
    this.needsUpdate = true
  }
}

export class Collector<T extends CollectedFile = CollectedFile> {
  files: Map<string, T>
  needsUpdate = false
  context: ModuleContext

  constructor(context: ModuleContext) {
    this.files = new Map()
    this.context = context
  }

  createCollectedFile(filePath: string): T {
    return new CollectedFile(filePath) as T
  }

  addFile(filePath: string) {
    this.files.set(filePath, this.createCollectedFile(filePath))
  }

  private handleAdd(filePath: string) {
    this.addFile(filePath)
  }

  private async handleChange(filePath: string) {
    const file = this.files.get(filePath)
    if (file) {
      file.setNeedsUpdate()
      this.needsUpdate = true
    }
  }

  private handleUnlink(filePath: string) {
    if (this.files.has(filePath)) {
      this.files.delete(filePath)
      this.needsUpdate = true
    }
  }

  private handleAddDir() {}

  private handleUnlinkDir(folderPath: string) {
    const allKeys = [...this.files.keys()]
    const toRemove = allKeys.filter((filePath) => filePath.includes(folderPath))
    if (toRemove.length) {
      toRemove.forEach((key) => this.files.delete(key))
      this.needsUpdate = true
    }
  }

  private async update(): Promise<void> {
    return Promise.resolve()
  }

  async handleWatchEvent(event: WatchEvent, filePath: string) {
    if (event === 'add') {
      this.handleAdd(filePath)
    } else if (event === 'change') {
      this.handleChange(filePath)
    } else if (event === 'unlink') {
      this.handleUnlink(filePath)
    } else if (event === 'addDir') {
      this.handleAddDir()
    } else if (event === 'unlinkDir') {
      this.handleUnlinkDir(filePath)
    }
  }
}
