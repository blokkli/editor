import { defineCodeTemplate, withHelper } from '../defineTemplate'
import { relative } from 'pathe'

export default withHelper((helper) => {
  return helper.getChunkNames().map((chunkName) => {
    return defineCodeTemplate(
      'chunk-' + chunkName,
      (ctx) => {
        const imports: string[] = []
        const map: Record<string, string> = {}

        for (const file of ctx.blocks.files.values()) {
          if (!file.definition || !file.identifier) {
            continue
          }

          if (file.chunkName !== chunkName) {
            continue
          }

          if (helper.isDev) {
            imports.push(
              `const ${file.identifier} = () => import('${relative(ctx.helper.paths.blokkliBuildDir, file.filePath)}').then(v => v.default)`,
            )
            file.variations.forEach((variation) => {
              map[variation] = `{ loadComponent: ${file.identifier} }`
            })
          } else {
            imports.push(
              `import ${file.identifier} from '${relative(ctx.helper.paths.blokkliBuildDir, file.filePath)}'`,
            )
            file.variations.forEach((variation) => {
              map[variation] = file.identifier!
            })
          }
        }

        const lines = Object.entries(map).map(([variation, importName]) => {
          return `'${variation}': ${importName}`
        })

        return `
${imports.join('\n')}

export const ${chunkName} = {
  ${lines.join(',\n  ')}
}
`
      },
      () => {
        return `
import type { Component } from 'vue'

export declare const ${chunkName}: Record<string, { loadComponent: () => Promise<Component> } | Component)>
`
      },
      {
        dependencies: ['block-path', 'block-content'],
      },
    )
  })
})
