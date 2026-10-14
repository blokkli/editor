import { createUnplugin } from 'unplugin'
import MagicString from 'magic-string'
import type { Nuxt } from '@nuxt/schema'
import { parseQuery, parseURL } from 'ufo'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'pathe'

const REPLACE_TARGET = 'import.meta.blokkliEditing'
const EDITING_MARKER = '__blokkli_editing__'

export const BlokkliEditingPlugin = (nuxt: Nuxt) => {
  /**
   * Vite's dev server can pass the URL of a module, relative to its root
   * (Nuxt's srcDir), where a file path is expected: "/components/Foo.vue" for
   * "<srcDir>/components/Foo.vue". It does when a module is requested before
   * Vite has seen the import that leads to it.
   */
  function toFilePath(path: string): string {
    if (!path.startsWith('/') || existsSync(path)) {
      return path
    }

    const inRoot = join(nuxt.options.srcDir, path)
    return existsSync(inRoot) ? inRoot : path
  }

  return createUnplugin(() => {
    return {
      name: 'blokkli:editing',
      enforce: 'pre',

      resolveId(id, importer, options) {
        // Vite's dependency scanner reads a resolved .vue file from disk,
        // where an editing variant doesn't exist. It imports the same as the
        // original component, so the scanner reads that one. unplugin's type
        // doesn't know Vite's option.
        if (options && 'scan' in options && options.scan) {
          return
        }

        // An editing variant requested by its URL, possibly one of Vue's
        // sub-modules ("?vue&type=style&index=0&lang.css").
        if (id.includes(EDITING_MARKER)) {
          const [markedPath = '', query] = id.split('?')
          const originalPath = markedPath.replace(EDITING_MARKER, '')
          const filePath = toFilePath(originalPath)
          if (filePath !== originalPath) {
            return (
              filePath.replace(/\.vue$/, `${EDITING_MARKER}.vue`) +
              (query ? '?' + query : '')
            )
          }
          return
        }

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
            return toFilePath(resolved).replace(
              /\.vue$/,
              `${EDITING_MARKER}.vue`,
            )
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
          resolvedPath = toFilePath(id)
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
        hotUpdate: {
          order: 'post' as const,
          async handler({ file, modules, server }) {
            if (!file.endsWith('.vue') || file.includes(EDITING_MARKER)) {
              return
            }

            const editingVariantPath = file.replace(
              /\.vue$/,
              `${EDITING_MARKER}.vue`,
            )

            const environment = server.environments['client']
            if (!environment) {
              return
            }

            const editingModules =
              environment.moduleGraph.getModulesByFile(editingVariantPath)

            if (!editingModules || editingModules.size === 0) {
              return
            }

            // Find the main editing variant module (no query string).
            const mainModule = [...editingModules].find(
              (m) => !m.url.includes('?'),
            )

            if (mainModule) {
              // Pre-transform the main module so Vue's SFC descriptor cache
              // is updated BEFORE any style sub-modules are served. Without
              // this, the browser may fetch a style sub-module concurrently,
              // and Vue's getDescriptor() would return the stale cached
              // descriptor — serving old CSS ("one step behind").
              environment.moduleGraph.invalidateModule(mainModule)
              await environment.transformRequest(mainModule.url)
            }

            return [...modules, ...editingModules]
          },
        },
      },
    }
  })
}
