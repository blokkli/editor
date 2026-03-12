import fs from 'fs'
import path from 'path'
import { marked } from 'marked'

const CHANGELOG_DIR = path.resolve(__dirname, '../../src/changelog')
const OUTPUT_FILE = path.resolve(
  __dirname,
  '../../src/runtime/editor/features/changelog/changelog.json',
)

type ChangelogEntry = {
  version: string
  date: string
  body: Record<string, string>
}

function parseFrontmatter(content: string): { date: string; body: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
  if (!match) {
    return { date: '', body: content }
  }

  const frontmatter = match[1]
  const body = match[2]

  const dateMatch = frontmatter.match(/date:\s*["']?(\d{4}-\d{2}-\d{2})["']?/)
  const date = dateMatch ? dateMatch[1] : ''

  return { date, body }
}

async function main() {
  if (!fs.existsSync(CHANGELOG_DIR)) {
    console.error(`Changelog directory not found: ${CHANGELOG_DIR}`)
    process.exit(1)
  }

  const versions = fs
    .readdirSync(CHANGELOG_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  const entries: ChangelogEntry[] = []

  for (const version of versions) {
    const versionDir = path.join(CHANGELOG_DIR, version)
    const enFile = path.join(versionDir, 'en.md')

    if (!fs.existsSync(enFile)) {
      console.warn(`Skipping ${version}: no en.md found`)
      continue
    }

    const enContent = fs.readFileSync(enFile, 'utf-8')
    const { date, body: enBody } = parseFrontmatter(enContent)
    const enHtml = await marked(enBody.trim())

    const body: Record<string, string> = { en: enHtml }

    const deFile = path.join(versionDir, 'de.md')
    if (fs.existsSync(deFile)) {
      const deContent = fs.readFileSync(deFile, 'utf-8')
      const { body: deBody } = parseFrontmatter(deContent)
      body.de = await marked(deBody.trim())
    }

    entries.push({ version, date, body })
  }

  entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  const outputDir = path.dirname(OUTPUT_FILE)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(entries, null, 2) + '\n')
  console.log(
    `Generated changelog with ${entries.length} entries: ${OUTPUT_FILE}`,
  )
}

main()
