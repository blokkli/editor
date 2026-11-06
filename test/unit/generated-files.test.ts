import { describe, expect, test } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The folders that blökkli writes its templates to (`#blokkli-build`): the
 * module's own and the playground's (`bun run dev:prepare`), and the sandbox
 * frontend's, with the sub-modules (its Nuxt daemon, or
 * `bun run sandbox:prepare`). The typechecks need them too.
 */
const GENERATED_DIRS = [
  '.nuxt/blokkli',
  'playground/.nuxt/blokkli',
  'sandbox/frontend/.nuxt/blokkli',
]

function getGeneratedFiles(dir: string): string[] {
  const fullPath = join(process.cwd(), dir)
  if (!existsSync(fullPath)) {
    return []
  }

  return readdirSync(fullPath, { encoding: 'utf8', recursive: true })
    .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))
    .map((file) => join(fullPath, file))
}

describe('Generated files', () => {
  // Without them, the test below would check nothing.
  test.each(GENERATED_DIRS)('%s has templates', (dir) => {
    expect(
      getGeneratedFiles(dir).length,
      `No templates in ${dir}: run "bun run dev:prepare" (the sandbox's come from its Nuxt daemon).`,
    ).toBeGreaterThan(0)
  })

  /**
   * Make sure the type declarations follow the same pattern. TypeScript would
   * refuse "declare export" (TS1029), but not with `skipLibCheck`, which Nuxt's
   * tsconfigs set.
   *
   * @see https://github.com/dulnan/nuxt-graphql-middleware/pull/78
   */
  test('should not contain "declare export" (invalid TypeScript syntax)', () => {
    const errors: string[] = []

    for (const dir of GENERATED_DIRS) {
      const files = getGeneratedFiles(dir)

      for (const filePath of files) {
        const content = readFileSync(filePath, 'utf-8')
        const lines = content.split('\n')

        lines.forEach((line, index) => {
          if (line.includes('declare export')) {
            errors.push(`${filePath}:${index + 1}: ${line.trim()}`)
          }
        })
      }
    }

    expect(
      errors,
      `Found "declare export" in generated files:\n${errors.join('\n')}`,
    ).toHaveLength(0)
  })
})
