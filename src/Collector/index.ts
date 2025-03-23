import type { WatchEvent } from 'nuxt/schema'
import type { ModuleHelper } from '../module/ModuleHelper'
import type { TemplateDependency } from '../module/templates/defineTemplate'

export type HandleWatchEventResult = {
  hasChanged: boolean
}

export class CollectedFile {
  constructor(
    public readonly filePath: string,
    public fileContents: string,
  ) {}

  async handleChange(): Promise<boolean> {
    return Promise.resolve(true)
  }
}

export class Collector<T extends CollectedFile = CollectedFile> {
  files: Map<string, T>
  protected needsFileContents: boolean = true

  constructor(protected helper: ModuleHelper) {
    this.files = new Map()
  }

  public async applies(filePath: string): Promise<boolean> {
    return Promise.resolve(false)
  }

  public createCollectedFile(filePath: string, fileContents = ''): T {
    return new CollectedFile(filePath, fileContents) as T
  }

  public getDependencyTypes(): TemplateDependency[] {
    return []
  }

  async addFile(filePath: string): Promise<void> {
    if (this.needsFileContents) {
      const contents = await this.helper.fileCache.read(filePath)
      const file = this.createCollectedFile(filePath, contents.toString())
      await file.handleChange()
      this.files.set(filePath, file)
    } else {
      const file = this.createCollectedFile(filePath)
      await file.handleChange()
      this.files.set(filePath, file)
    }
  }

  private async handleAdd(filePath: string): Promise<boolean> {
    const applies = await this.applies(filePath)
    if (applies) {
      await this.addFile(filePath)
      return true
    }

    return false
  }

  private async handleChange(filePath: string): Promise<boolean> {
    const applies = await this.applies(filePath)
    if (!applies) {
      // It's possible the file applied before but not anymore.
      // In this case we want to remove it.
      return this.handleUnlink(filePath)
    }

    const file = this.files.get(filePath)
    if (!file) {
      return false
    }

    if (this.needsFileContents) {
      const contents = await this.helper.fileCache.read(filePath)
      file.fileContents = contents.toString()
      return await file.handleChange()
    }

    return true
  }

  private handleUnlink(filePath: string): boolean {
    if (this.files.has(filePath)) {
      this.files.delete(filePath)
      return true
    }

    return false
  }

  private handleAddDir() {
    return false
  }

  private handleUnlinkDir(folderPath: string) {
    const allKeys = [...this.files.keys()]
    const toRemove = allKeys.filter((filePath) => filePath.includes(folderPath))
    if (toRemove.length) {
      toRemove.forEach((key) => this.files.delete(key))
      return true
    }

    return false
  }

  async handleWatchEvent(
    event: WatchEvent,
    filePath: string,
  ): Promise<HandleWatchEventResult> {
    let hasChanged = false
    if (event === 'add') {
      hasChanged = await this.handleAdd(filePath)
    } else if (event === 'change') {
      hasChanged = await this.handleChange(filePath)
    } else if (event === 'unlink') {
      hasChanged = this.handleUnlink(filePath)
    } else if (event === 'addDir') {
      hasChanged = this.handleAddDir()
    } else if (event === 'unlinkDir') {
      hasChanged = this.handleUnlinkDir(filePath)
    }

    return { hasChanged }
  }
}
