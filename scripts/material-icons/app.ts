import fs from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'
import { glob } from 'glob'
import { format } from './../helpers'

const RUNTIME_PATH = path.resolve(__dirname, '../../src/runtime')
const PACKAGES_RUNTIME_PATH = path.resolve(__dirname, '../../src/modules/*')

const USED_ICONS_OUTPUT_PATH = path.resolve(
  __dirname,
  '../../src/build/used-icons.ts',
)

async function findUsedIcons(): Promise<string[]> {
  const patterns = [
    path.join(RUNTIME_PATH, '**/*.{vue,ts}'),
    path.join(PACKAGES_RUNTIME_PATH, '**/*.{vue,ts}'),
  ]
  const files = (await Promise.all(patterns.map((p) => glob(p)))).flat()

  const usedIcons = new Set<string>()
  const iconPattern = /bk_mdi_[a-z0-9_-]+/g

  for (const file of files) {
    const content = await fs.promises.readFile(file, 'utf-8')
    const matches = content.match(iconPattern)

    if (matches) {
      for (const match of matches) {
        usedIcons.add(match)
      }
    }
  }

  return Array.from(usedIcons).sort()
}

async function main() {
  // Find and generate used icons file.
  console.log(chalk.blue('Scanning for used icons...\n'))

  const usedIcons = await findUsedIcons()
  console.log(chalk.gray(`  Found ${usedIcons.length} used icons\n`))

  const usedIconsContent = `/**
 * Auto-generated file. Do not edit manually.
 * Run "npm run material-icons" to regenerate.
 */

/**
 * All Material Symbols icons used in the runtime.
 */
export const USED_MATERIAL_ICONS = [
${usedIcons.map((name) => `  '${name}',`).join('\n')}
] as const
`

  const formattedUsedIcons = await format(usedIconsContent, 'typescript')
  await fs.promises.mkdir(path.dirname(USED_ICONS_OUTPUT_PATH), {
    recursive: true,
  })
  await fs.promises.writeFile(USED_ICONS_OUTPUT_PATH, formattedUsedIcons)

  console.log(chalk.green(`Generated ${USED_ICONS_OUTPUT_PATH}`))
  console.log(chalk.gray(`  Used icons: ${usedIcons.length}`))
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error)
  process.exit(1)
})
