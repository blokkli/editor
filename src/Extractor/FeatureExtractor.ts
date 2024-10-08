import fs from 'node:fs'
import type { FeatureDefinition } from '../runtime/types'
import type { AdapterMethods } from '../runtime/adapter/index'
import { falsy } from '../vitePlugin'

export type ExtractedFeatureDefinition = {
  id: string
  componentName: string
  componentPath: string
  filePath: string
  definition: FeatureDefinition<AdapterMethods[]>
  source: string
}

/**
 * Service to handle text extractions across multiple files.
 */
export default class Extractor {
  definitions: Record<string, ExtractedFeatureDefinition | undefined> = {}
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
        this.definitions[filePath] = undefined
        return true
      }

      return false
    }

    const { definition, source } = extracted

    // New file that didn't previously contain a blokkli component definition.
    if (!this.definitions[filePath]) {
      const regex = /\/Features\/([^/]+)\//
      const componentName = filePath.match(regex)?.[1] || ''
      this.definitions[filePath] = {
        id: definition.id,
        componentName,
        componentPath: filePath,
        filePath,
        definition,
        source,
      }
      return true
    }

    // If the the definition didn't change, return.
    if (this.definitions[filePath]?.definition === definition) {
      return false
    }

    // Update the definition.
    this.definitions[filePath]!.definition = definition

    return true
  }

  /**
   * Extract the single text method calls.
   */
  extractSingle(
    code: string,
    filePath: string,
  ): { definition: FeatureDefinition<any>; source: string } | undefined {
    const pattern = this.composableName + '\\((\\{.+?\\})\\)'
    const rgx = new RegExp(pattern, 'gms')
    const source = rgx.exec(code)?.[1]
    if (source) {
      try {
        const definition = eval(`(${source})`)
        return { definition, source }
      } catch (e) {
        console.error(
          `Failed to parse component "${filePath}": ${this.composableName} does not contain a valid object literal. No variables and methods are allowed inside ${this.composableName}().`,
          e,
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

  getFeatures(): ExtractedFeatureDefinition[] {
    return Object.values(this.definitions).filter(falsy)
  }
}
