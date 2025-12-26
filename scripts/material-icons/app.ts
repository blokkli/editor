import fs from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'
import { glob } from 'glob'
import { format } from './../helpers'

const ICONS_PATH = path.resolve(
  __dirname,
  '../../node_modules/@material-symbols/svg-600/rounded',
)

const RUNTIME_PATH = path.resolve(__dirname, '../../src/runtime')

const TYPES_OUTPUT_PATH = path.resolve(
  __dirname,
  '../../src/runtime/material-icons/index.ts',
)

const USED_ICONS_OUTPUT_PATH = path.resolve(
  __dirname,
  '../../src/build/used-icons.ts',
)

// File to exclude from scanning (the generated types file itself).
const EXCLUDE_FILE = path.resolve(
  __dirname,
  '../../src/runtime/material-icons/index.ts',
)

function getIconNames(): string[] {
  const files = fs.readdirSync(ICONS_PATH)

  return files
    .filter((file) => file.endsWith('.svg'))
    .map((file) => file.replace('.svg', ''))
    .sort()
}

async function findUsedIcons(): Promise<string[]> {
  const pattern = path.join(RUNTIME_PATH, '**/*.{vue,ts}')
  const files = await glob(pattern)

  const usedIcons = new Set<string>()
  const iconPattern = /bk_mdi_[a-z0-9_-]+/g

  for (const file of files) {
    // Skip the generated types file.
    if (path.resolve(file) === EXCLUDE_FILE) {
      continue
    }

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
  console.log(chalk.blue('Generating Material Symbols icon types...\n'))

  // Generate types file.
  const iconNames = getIconNames()
  console.log(chalk.gray(`  Found ${iconNames.length} available icons\n`))

  const typeContent = `/**
 * Auto-generated file. Do not edit manually.
 * Run "npm run material-icons" to regenerate.
 */

/**
 * All available Material Symbols icon names (rounded style).
 */
export type MaterialIconName =
${iconNames.map((name) => `  | 'bk_mdi_${name}'`).join('\n')}

/**
 * Total number of available icons: ${iconNames.length}
 */
export const MATERIAL_ICON_COUNT = ${iconNames.length} as const
`

  const formattedTypes = await format(typeContent, 'typescript')
  await fs.promises.mkdir(path.dirname(TYPES_OUTPUT_PATH), { recursive: true })
  await fs.promises.writeFile(TYPES_OUTPUT_PATH, formattedTypes)

  console.log(chalk.green(`Generated ${TYPES_OUTPUT_PATH}`))
  console.log(chalk.gray(`  Total icons: ${iconNames.length}\n`))

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
