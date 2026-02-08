import { program } from 'commander'
import chalk from 'chalk'
import { getSourceTexts, INTERNAL_TRANSLATIONS, LANGUAGES } from './extract'
import { updateTranslationFile, readPoFile, updatePoKeys } from './po'

program.name('texts').description('Manage blökkli translation files')

program
  .command('sync', { isDefault: true })
  .description('Extract source texts and update all PO/JSON files')
  .action(async () => {
    const sourceTexts = await getSourceTexts()

    await Promise.all(
      LANGUAGES.map((v) =>
        updateTranslationFile(v, { ...sourceTexts, ...INTERNAL_TRANSLATIONS }),
      ),
    )

    console.log(chalk.green('All translation files updated.'))
  })

program
  .command('missing <language>')
  .description('List missing translations for a language')
  .action(async (language: string) => {
    if (!(LANGUAGES as readonly string[]).includes(language)) {
      console.error(
        chalk.red(
          `Unknown language "${language}". Available: ${LANGUAGES.join(', ')}`,
        ),
      )
      process.exit(1)
    }

    const entries = await readPoFile(language)
    const missing = Object.entries(entries).filter(
      ([_, entry]) => !entry.translation,
    )

    if (missing.length === 0) {
      console.log(chalk.green(`No missing translations for ${language}.`))
      process.exit(0)
    }

    console.log(
      chalk.yellow(`${missing.length} missing translations for ${language}:\n`),
    )

    for (const [key, entry] of missing) {
      console.log(`${key}: ${chalk.dim(`"${entry.source}"`)}`)
    }

    process.exit(1)
  })

program
  .command('update <language> [pairs...]')
  .description('Update translations for specific keys (key="translated text")')
  .action(async (language: string, pairs: string[]) => {
    if (!(LANGUAGES as readonly string[]).includes(language)) {
      console.error(
        chalk.red(
          `Unknown language "${language}". Available: ${LANGUAGES.join(', ')}`,
        ),
      )
      process.exit(1)
    }

    if (pairs.length === 0) {
      console.error(chalk.red('No key=value pairs provided.'))
      process.exit(1)
    }

    const updates: Record<string, string> = {}
    for (const pair of pairs) {
      const eqIndex = pair.indexOf('=')
      if (eqIndex === -1) {
        console.error(
          chalk.red(`Invalid pair "${pair}". Expected format: key="value"`),
        )
        process.exit(1)
      }
      const key = pair.substring(0, eqIndex)
      let value = pair.substring(eqIndex + 1)
      // Strip surrounding quotes if present.
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      updates[key] = value
    }

    try {
      await updatePoKeys(language, updates)
    } catch (e: any) {
      console.error(chalk.red(e.message))
      process.exit(1)
    }

    console.log(
      chalk.green(
        `Updated ${Object.keys(updates).length} translation(s) in ${language}.po`,
      ),
    )
  })

program.parse()
