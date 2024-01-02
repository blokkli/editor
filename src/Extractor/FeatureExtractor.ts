import fs from 'fs'
import type { BlokkliFeatureDefinition } from '../runtime/types'
import type { AdapterMethods } from '../runtime/adapter/index'

type ExtractedDefinition = {
  id: string
  filePath: string
  definition: BlokkliFeatureDefinition<AdapterMethods[]>
  source: string
}

/**
 * Service to handle text extractions across multiple files.
 */
export default class Extractor {
  definitions: Record<string, ExtractedDefinition> = {}
  isBuild = false
  composableName: string

  constructor(isBuild = false) {
    this.isBuild = isBuild
    this.composableName = 'defineBlokkliFeature'
  }

  /**
   * Add files by path.
   */
  addFiles(files: string[]): Promise<boolean[]> {
    return Promise.all(files.map((v) => this.handleFile(v)))
  }

  /**
   * Read the file and extract the blokkli component definitions.
   *
   * Returns a promise containing a boolean that indicated if the given file
   * should trigger a rebuild of the query.
   */
  async handleFile(filePath: string): Promise<boolean> {
    const fileSource = await this.readFile(filePath)
    const extracted = this.extractSingle(fileSource, filePath)
    if (!extracted) {
      if (this.definitions[filePath]) {
        delete this.definitions[filePath]
        return true
      }

      return false
    }

    const { definition, source } = extracted

    // New file that didn't previously contain a blokkli component definition.
    if (!this.definitions[filePath]) {
      const regex = /\/Features\/([^/]+)\//
      const id = filePath.match(regex)?.[1] || ''
      this.definitions[filePath] = {
        id,
        filePath,
        definition,
        source,
      }
      return true
    }

    // If the the definition didn't change, return.
    if (this.definitions[filePath].definition === definition) {
      return false
    }

    // Update the definition.
    this.definitions[filePath].definition = definition

    return true
  }

  /**
   * Extract the single text method calls.
   */
  extractSingle(
    code: string,
    filePath: string,
  ): { definition: BlokkliFeatureDefinition<any>; source: string } | undefined {
    const pattern = this.composableName + '\\((\\{.+?\\})\\)'
    const rgx = new RegExp(pattern, 'gms')
    const source = rgx.exec(code)?.[1]
    if (source) {
      try {
        // @ts-ignore
        const definition = eval(`(${source})`)
        return { definition, source }
      } catch (e) {
        console.error(
          `Failed to parse component "${filePath}": ${this.composableName} does not contain a valid object literal. No variables and methods are allowed inside ${this.composableName}().`,
        )
      }
    }
  }

  /**
   * Read the given file and return its contents.
   */
  readFile(filePath: string) {
    return fs.promises.readFile(filePath).then((v) => {
      return v.toString()
    })
  }

  getFeatures(): ExtractedDefinition[] {
    return Object.values(this.definitions)
  }
}
