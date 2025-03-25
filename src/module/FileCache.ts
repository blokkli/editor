import fs from 'node:fs'
import type { WatchEvent } from 'nuxt/schema'

export class FileCache {
  private cache: Map<string, string> = new Map()
  private existingFiles: Set<string> = new Set()

  public async read(filePath: string): Promise<string> {
    const existing = this.cache.get(filePath)
    if (existing) {
      return existing
    }

    const buffer = await fs.promises.readFile(filePath)
    const content = buffer.toString()
    this.cache.set(filePath, content)
    return content
  }

  public delete(filePath: string) {
    this.cache.delete(filePath)
  }

  public fileExists(filePath: string): boolean {
    if (this.existingFiles.has(filePath)) {
      return true
    }

    const exists = fs.existsSync(filePath)
    if (exists) {
      this.existingFiles.add(filePath)
    }

    return exists
  }

  async handleWatchEvent(event: WatchEvent, filePath: string) {
    if (event === 'add') {
      this.existingFiles.add(filePath)
    } else if (event === 'change') {
      this.existingFiles.add(filePath)
    } else if (event === 'unlink') {
      this.existingFiles.delete(filePath)
    } else if (event === 'unlinkDir') {
      const filePaths = [...this.existingFiles.keys()]
      filePaths.forEach((v) => {
        if (v.startsWith(filePath)) {
          this.existingFiles.delete(v)
        }
      })
    }
  }
}
