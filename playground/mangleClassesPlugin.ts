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
  }
}
