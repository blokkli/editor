import fs from 'node:fs'
import type { WatchEvent } from 'nuxt/schema'

export class FileCache {
  private cache: Map<string, string> = new Map()
  private existingFiles: Set<string> = new Set()

  /**
   * Read a file from disk.
   */
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

  /**
   * Delete a file.
   */
  public delete(filePath: string) {
    this.cache.delete(filePath)
  }

  /**
   * Check if a file exists.
   */
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

  /**
   * Handles the builder watch event.
   */
  async handleWatchEvent(event: WatchEvent, filePath: string) {
    if (event === 'add') {
      this.existingFiles.add(filePath)
      this.cache.delete(filePath)
    } else if (event === 'change') {
      this.existingFiles.add(filePath)
      this.cache.delete(filePath)
    } else if (event === 'unlink') {
      this.existingFiles.delete(filePath)
      this.cache.delete(filePath)
    } else if (event === 'unlinkDir') {
      const filePaths = [...this.existingFiles.keys()]
      filePaths.forEach((v) => {
        if (v.startsWith(filePath)) {
          this.existingFiles.delete(v)
          this.cache.delete(v)
        }
      })
    }
  }
}
