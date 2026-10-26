import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { ROOT, TEMPLATE } from './support/sandbox'

// What the E2E template is baked from: files and directories.
const SOURCES = [
  'sandbox/drupal/config/sync',
  'sandbox/drupal/web/modules/custom/blokkli_playground/src/Seed',
  // The template command (blokkli-playground:template).
  'sandbox/drupal/web/modules/custom/blokkli_playground/src/Drush',
  // The container is baked too, with the test modules' service changes, the
  // module's services and parameters, and the site's parameters.
  'sandbox/drupal/paragraphs_blokkli/modules/paragraphs_blokkli_deepl/tests/modules',
  'sandbox/drupal/paragraphs_blokkli/paragraphs_blokkli.services.yml',
  'sandbox/drupal/services.yml',
  'sandbox/drupal/web/modules/custom/blokkli_playground/tests/modules',
  'test/e2e-drupal/content',
  '.ddev/commands/web/bake-e2e',
  // The template caches the GraphQL schema; a change to it is dumped here.
  'build/drupal-schema.graphql',
]

// The template caches the plugin definitions: a change to a plugin's
// attribute (a mutation's version, which new mutations are stored with) needs
// a bake. These are the plugins of the module, its submodules and the custom
// modules.
const PLUGIN_MODULES = ['sandbox/drupal/paragraphs_blokkli']
const PLUGIN_MODULE_DIRECTORIES = [
  'sandbox/drupal/paragraphs_blokkli/modules',
  'sandbox/drupal/web/modules/custom',
]

/** The `src/Plugin` directories of the modules that have plugins. */
function pluginDirectories(): string[] {
  const modules = [
    ...PLUGIN_MODULES,
    ...PLUGIN_MODULE_DIRECTORIES.flatMap((directory) =>
      readdirSync(`${ROOT}${directory}`, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => `${directory}/${entry.name}`),
    ),
  ]
  return modules
    .map((module) => `${module}/src/Plugin`)
    .filter((path) => existsSync(`${ROOT}${path}`))
}

function files(path: string): string[] {
  if (statSync(path).isFile()) {
    return [path]
  }
  return readdirSync(path, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => `${entry.parentPath}/${entry.name}`)
}

function fingerprint(): string {
  const hash = createHash('sha256')
  for (const source of [...SOURCES, ...pluginDirectories()]) {
    for (const file of files(`${ROOT}${source}`).sort()) {
      hash.update(file.slice(ROOT.length)).update(readFileSync(file))
    }
  }
  // The seeded dates are relative to the bake.
  hash.update(new Date().toISOString().slice(0, 10))
  return hash.digest('hex')
}

/**
 * Bakes the E2E template when what it's baked from changed, or on a new day.
 */
export default function setup(): void {
  const file = `${TEMPLATE}/fingerprint`
  const current = fingerprint()
  if (existsSync(file) && readFileSync(file, 'utf8') === current) {
    return
  }
  const start = performance.now()
  execSync('ddev bake-e2e', { cwd: ROOT, stdio: 'inherit' })
  writeFileSync(file, current)
  console.log(
    `[e2e-drupal] Baked the template in ${Math.round(performance.now() - start)} ms.`,
  )
}
