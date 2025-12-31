import { createUnplugin } from 'unplugin'
import MagicString from 'magic-string'
import type { Nuxt } from '@nuxt/schema'
import { parseQuery, parseURL } from 'ufo'
import { readFileSync } from 'node:fs'

const REPLACE_TARGET = 'import.meta.blokkliEditing'
const EDITING_MARKER = '__blokkli_editing__'

export const BlokkliEditingPlugin = (nuxt: Nuxt) => {
  return createUnplugin(() => {
    return {
      name: 'blokkli:editing',
      enforce: 'pre',

      resolveId(id) {
        const { pathname, search } = parseURL(decodeURIComponent(id))

        // Only handle ?blokkliEditing=true imports on .vue files.
        if (!search || !pathname.endsWith('.vue')) {
          return
        }

        const query = parseQuery(search)
        if (query.blokkliEditing !== 'true') {
          return
        }

        // Return a modified path that Vue's plugin will still recognize as
        // a .vue file, but is distinct from the original.
        return pathname.replace(/\.vue$/, `${EDITING_MARKER}.vue`)
      },

      load(id) {
        // Only handle the main .vue file, not Vue's virtual sub-modules
        // (which have ?vue&type=script etc. in their ID).
        if (!id.includes(EDITING_MARKER) || id.includes('?')) {
          return
        }

        // Get the original file path and read its content.
        const originalPath = id.replace(EDITING_MARKER, '')

        // Tell Vite to watch the original file for HMR.
        this.addWatchFile(originalPath)

        return readFileSync(originalPath, 'utf-8')
      },

      transform(source, id) {
        if (!source.includes(REPLACE_TARGET)) {
          return
        }

        // Check if this module was imported through our editing marker.
        const isEditing = id.includes(EDITING_MARKER)
        const replacement = isEditing ? 'true' : 'false'

        const s = new MagicString(source)
        let index = source.indexOf(REPLACE_TARGET)

        while (index !== -1) {
          s.overwrite(index, index + REPLACE_TARGET.length, replacement)
          index = source.indexOf(REPLACE_TARGET, index + 1)
        }

        if (s.hasChanged()) {
          return {
            code: s.toString(),
            map:
              nuxt.options.sourcemap.client || nuxt.options.sourcemap.server
                ? s.generateMap({ hires: true })
                : null,
          }
        }
      },

      vite: {
        handleHotUpdate({ file, server, modules }) {
          // When a .vue file changes, also invalidate its editing variant.
          if (file.endsWith('.vue') && !file.includes(EDITING_MARKER)) {
            const editingVariantPath = file.replace(
              /\.vue$/,
              `${EDITING_MARKER}.vue`,
            )
            const editingModule =
              server.moduleGraph.getModuleById(editingVariantPath)

            if (editingModule) {
              // Invalidate the editing variant module.
              server.moduleGraph.invalidateModule(editingModule)

              // Return both the original modules and the editing variant.
              return [...modules, editingModule]
            }
          }
        },
      },
    }
  })
}
