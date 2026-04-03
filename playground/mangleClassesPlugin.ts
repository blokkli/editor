import type { Plugin } from 'vite'
import { mangleVueSFC } from '../src/build/mangleTransform'

/**
 * Mangle Tailwind utility class names in Vue SFC source files.
 *
 * Transforms:
 * 1. Static class="..." attributes — split + rename tokens
 * 2. :class="..." bindings — parsed with acorn, only class-name strings renamed
 * 3. tw('...') calls — rename tokens in the string argument
 * 4. <style> blocks — processed through blökkli's PostCSS pipeline
 *
 * Only processes files under src/runtime/ and src/modules/ (the blökkli editor source).
 * This plugin is playground-only — consumers get pre-mangled files from dist.
 */
export default function mangleClassesPlugin(): Plugin {
  return {
    name: 'blokkli-mangle-classes',
    enforce: 'pre',

    async transform(code, id) {
      if (
        !id.endsWith('.vue') ||
        (!id.includes('/src/runtime/') && !id.includes('/src/modules/'))
      ) {
        return null
      }

      const result = await mangleVueSFC(code, id)
      return result ? { code: result, map: null } : null
    },

    hotUpdate: {
      order: 'post',
      async handler({ file, server, modules: hmrModules }) {
        if (
          !file.endsWith('.vue') ||
          (!file.includes('/src/runtime/') && !file.includes('/src/modules/'))
        ) {
          return
        }

        const environment = server.environments['client']
        if (!environment) return

        const modules = environment.moduleGraph.getModulesByFile(file)
        if (!modules || modules.size === 0) return

        // Re-transform the main module so Vue's SFC descriptor cache
        // has the mangled CSS before style sub-modules are served.
        const mainModule = [...modules].find((m) => !m.url.includes('?'))
        if (mainModule) {
          environment.moduleGraph.invalidateModule(mainModule)
          await environment.transformRequest(mainModule.url)
        }

        // Vue's handleHotUpdate compares the raw file (un-mangled) against
        // the old descriptor (mangled), so it thinks the entire component
        // changed and only returns the main module for a JS update.
        // We must explicitly include the style sub-modules so the browser
        // also receives a CSS update.
        const styleModules = [...modules].filter((m) =>
          m.url.includes('type=style'),
        )

        if (styleModules.length) {
          for (const styleMod of styleModules) {
            environment.moduleGraph.invalidateModule(styleMod)
          }

          const result = [...hmrModules]
          for (const styleMod of styleModules) {
            if (!result.some((m) => m.url === styleMod.url)) {
              result.push(styleMod)
            }
          }
          return result
        }
      },
    },
  }
}
