import fs from 'node:fs/promises'

export class FileCache {
  private cache: Map<string, string> = new Map()

  public async read(filePath: string): Promise<string> {
    const existing = this.cache.get(filePath)
    if (existing) {
      return existing
    }

    const buffer = await fs.readFile(filePath)
    const content = buffer.toString()
    this.cache.set(filePath, content)
    return content
  }

  public delete(filePath: string) {
    this.cache.delete(filePath)
  }
}
