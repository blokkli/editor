/**
 * Post-process dist/ to mangle Tailwind utility class names and
 * pre-process <style> blocks through blökkli's PostCSS pipeline.
 *
 * Run after `nuxt-module-build build` to transform the source .vue and .ts
 * files that ship in the npm package. The main CSS (output.css) is already
 * mangled by the PostCSS plugin during styles:build.
 *
 * Usage: npx tsx scripts/mangle-dist.ts
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  mangleTemplateAndScript,
  processStyleBlocks,
} from '../src/build/mangleTransform'

// --- Walk directory ---

async function* walkFiles(
  dir: string,
  extensions: string[],
): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walkFiles(fullPath, extensions)
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      yield fullPath
    }
  }
}

// --- Main ---

const distDirs = [
  join(process.cwd(), 'dist', 'runtime'),
  join(process.cwd(), 'dist', 'modules'),
]

let filesProcessed = 0
let filesChanged = 0

for (const distDir of distDirs) {
  for await (const filePath of walkFiles(distDir, ['.vue', '.ts'])) {
    const original = await readFile(filePath, 'utf-8')
    let transformed = mangleTemplateAndScript(original)
    // Process <style> blocks in Vue files.
    if (filePath.endsWith('.vue')) {
      transformed = await processStyleBlocks(transformed, filePath)
    }
    filesProcessed++

    if (transformed !== original) {
      await writeFile(filePath, transformed, 'utf-8')
      filesChanged++
    }
  }
}

console.log(
  `Mangled classes in ${filesChanged}/${filesProcessed} files in dist/`,
)
