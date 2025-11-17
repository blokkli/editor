import { defineCodeTemplate } from '../defineTemplate'
import fs from 'node:fs'
import { toObject } from '../helpers'

/**
 * Generates a template with all inlined block component imports, for use during editing.
 */
export default defineCodeTemplate(
  'chunk-editing',
  (ctx) => {
    const imports: string[] = []
    const map = new Map<string, string>()

    for (const file of ctx.blocks.files.values()) {
      if (!file.definition) {
        continue
      }

      if (file.type === 'provider') {
        continue
      }

      if (!fs.existsSync(file.filePath)) {
        continue
      }

      imports.push(`import ${file.identifier} from '${file.filePath}'`)
      file.variations.forEach((variation) => {
        map.set(variation, file.identifier)
      })
    }

    return `
${imports.sort().join('\n')}

${toObject('allComponents', map)}
`
  },
  () => {
    return `
import type { Component } from 'vue'

/**
 * A map of block import identifier and block component.
 *
 * This should ONLY be imported in editor code, since it imports ALL block components.
 */
export declare const allComponents: Record<string, Component>
`
  },
  {
    dependencies: ['block-path', 'block-content'],
  },
)
