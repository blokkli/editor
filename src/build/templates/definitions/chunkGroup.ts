import { defineCodeTemplate, withHelper } from '../defineTemplate'
import fs from 'node:fs'

export default withHelper((helper) => {
  return helper.getChunkNames().map((chunkName) => {
    return defineCodeTemplate(
      'chunk-' + chunkName,
      (ctx) => {
        const imports: string[] = []
        const map: Record<string, string> = {}

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

          if (file.chunkName !== chunkName) {
            continue
          }

          const relativePath = ctx.helper.toModuleBuildRelative(file.filePath)
          if (helper.isDev) {
            imports.push(
              `const ${file.identifier} = () => import('${relativePath}').then(v => v.default)`,
            )
            file.variations.forEach((variation) => {
              map[variation] = `{ loadComponent: ${file.identifier} }`
            })
          } else {
            imports.push(`import ${file.identifier} from '${relativePath}'`)
            file.variations.forEach((variation) => {
              map[variation] = file.identifier!
            })
          }
        }

        const lines = Object.entries(map).map(([variation, importName]) => {
          return `'${variation}': ${importName}`
        })

        return `
${imports.sort().join('\n')}

export const ${chunkName} = {
  ${lines.sort().join(',\n  ')}
}
`
      },
      () => {
        return `
import type { Component } from 'vue'
export declare const ${chunkName}: Record<string, { loadComponent: () => Promise<Component> } | Component>
`
      },
      {
        dependencies: ['block-path', 'block-content'],
      },
    )
  })
})
