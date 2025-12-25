import { describe, expect, test } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const GENERATED_DIRS = ['.nuxt/blokkli-build', 'playground/.nuxt/blokkli-build']

function getGeneratedFiles(dir: string): string[] {
  const fullPath = join(process.cwd(), dir)
  if (!existsSync(fullPath)) {
    return []
  }

  return readdirSync(fullPath)
    .filter(
      (file) =>
        file.endsWith('.ts') || file.endsWith('.d.ts') || file.endsWith('.js'),
    )
    .map((file) => join(fullPath, file))
}

describe('Generated files', () => {
  /**
   * Make sure the type declarations follow the same pattern.
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
