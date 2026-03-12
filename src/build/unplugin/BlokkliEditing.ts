import { createUnplugin } from 'unplugin'
import MagicString from 'magic-string'
import type { Nuxt } from '@nuxt/schema'
import { parseQuery, parseURL } from 'ufo'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'pathe'

const REPLACE_TARGET = 'import.meta.blokkliEditing'
const EDITING_MARKER = '__blokkli_editing__'

export const BlokkliEditingPlugin = (nuxt: Nuxt) => {
  return createUnplugin(() => {
    return {
      name: 'blokkli:editing',
      enforce: 'pre',

      resolveId(id, importer) {
        const { pathname, search } = parseURL(decodeURIComponent(id))

        // Check if this is a direct ?blokkliEditing=true import.
        if (search && pathname.endsWith('.vue')) {
          const query = parseQuery(search)
          if (query.blokkliEditing === 'true') {
            // Resolve relative paths against the importer directory.
            let resolved = pathname
            if (importer && pathname.startsWith('.')) {
              const importerBase = importer.split('?')[0] || ''
              resolved = resolve(dirname(importerBase), pathname)
            }

            // Return a modified path that Vue's plugin will still recognize as
            // a .vue file, but is distinct from the original.
            return resolved.replace(/\.vue$/, `${EDITING_MARKER}.vue`)
          }
        }

        // Check if the importer is in editing mode and propagate to .vue imports.
        // The importer might be a virtual module like:
        // /path/to/Slider__blokkli_editing__.vue?vue&type=script&setup=true&lang.ts
        if (
          !importer ||
          !importer.includes(EDITING_MARKER) ||
          !id.endsWith('.vue')
        ) {
          return
        }

        // Extract the base path from the importer (remove query string and marker).
        const importerWithoutQuery = importer.split('?')[0]
        if (!importerWithoutQuery) {
          return
        }
        const importerBase = importerWithoutQuery.replace(EDITING_MARKER, '')
        const importerDir = dirname(importerBase)

        // Handle both relative and absolute paths.
        let resolvedPath: string | null = null
        if (id.startsWith('.')) {
          resolvedPath = resolve(importerDir, id)
        } else if (id.startsWith('/')) {
          resolvedPath = id
        }

        // Only propagate if the resolved file exists (it's a local component).
        if (resolvedPath && existsSync(resolvedPath)) {
          return resolvedPath.replace(/\.vue$/, `${EDITING_MARKER}.vue`)
        }
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
        handleHotUpdate({ file, server }) {
          // When a .vue file changes, also reload its editing variant.
          // We must trigger this separately (not by returning it in the
          // modules array) because Vue's vite:vue plugin runs after us
          // and filters the modules list to only include the original
          // file's sub-modules, dropping our editing variant.
          if (file.endsWith('.vue') && !file.includes(EDITING_MARKER)) {
            const editingVariantPath = file.replace(
              /\.vue$/,
              `${EDITING_MARKER}.vue`,
            )
            const editingModule =
              server.moduleGraph.getModuleById(editingVariantPath)

            if (editingModule) {
              server.reloadModule(editingModule)
            }
          }
        },
      },
    }
  })
}
