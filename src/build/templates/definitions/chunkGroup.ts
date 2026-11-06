import { defineCodeTemplate, withHelper } from '../defineTemplate'
import fs from 'node:fs'
import type { CollectedBlockFile } from '../../Collector/Blocks'

type ChunkGroupFile = Pick<
  CollectedBlockFile,
  'identifier' | 'filePath' | 'variations' | 'hydrate'
>

/**
 * The code of a chunk group's template: the components of its files, by
 * variation.
 *
 * In production, a component is imported statically, so that it's in the
 * group's chunk; in dev, it's loaded when it's first rendered.
 *
 * A component with `hydrate` goes through Nuxt's
 * `defineLazyHydrationComponent()`, in dev and in production: it gets a chunk
 * of its own, which is loaded when the component hydrates. That only works in
 * the global group: getComponent() would wrap a component of another group in
 * an async component again. Nuxt only transforms the macro when it's the
 * initialiser of a variable, with a string literal as the strategy.
 */
export function buildChunkGroupCode(
  chunkName: string,
  files: ChunkGroupFile[],
  options: {
    isDev: boolean
    /** Whether `hydrate` applies, see ModuleHelper.canLazyHydrate(). */
    lazyHydration: boolean
  },
): string {
  const imports: string[] = []
  const lazyComponents: string[] = []
  const map: Record<string, string> = {}

  for (const file of files) {
    const hydrate =
      options.lazyHydration && chunkName === 'global' ? file.hydrate : null

    if (hydrate) {
      lazyComponents.push(
        `const ${file.identifier} = defineLazyHydrationComponent('${hydrate}', () => import('${file.filePath}'))`,
      )
      file.variations.forEach((variation) => {
        map[variation] = file.identifier
      })
    } else if (options.isDev) {
      imports.push(
        `const ${file.identifier} = () => import('${file.filePath}').then(v => v.default)`,
      )
      file.variations.forEach((variation) => {
        map[variation] = `{ loadComponent: ${file.identifier} }`
      })
    } else {
      imports.push(`import ${file.identifier} from '${file.filePath}'`)
      file.variations.forEach((variation) => {
        map[variation] = file.identifier
      })
    }
  }

  const lines = Object.entries(map).map(([variation, importName]) => {
    return `'${variation}': ${importName}`
  })

  const code = [
    ...(lazyComponents.length
      ? [`import { defineLazyHydrationComponent } from '#imports'`]
      : []),
    ...imports.sort(),
    ...lazyComponents.sort(),
  ]

  return `
${code.join('\n')}

export const ${chunkName} = {
  ${lines.sort().join(',\n  ')}
}
`
}

export default withHelper((helper) => {
  return helper.getChunkNames().map((chunkName) => {
    return defineCodeTemplate(
      'chunk-' + chunkName,
      (ctx) => {
        const files = [...ctx.blocks.files.values()].filter(
          (file) =>
            file.definition &&
            file.type !== 'provider' &&
            fs.existsSync(file.filePath) &&
            file.chunkName === chunkName,
        )

        return buildChunkGroupCode(chunkName, files, {
          isDev: helper.isDev,
          lazyHydration: helper.canLazyHydrate(),
        })
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
