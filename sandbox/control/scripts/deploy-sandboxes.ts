import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { databaseFile, now } from '../server/utils/db'
import { deploySandboxes } from '../server/utils/deploySandboxes'

// `ddev deploy` runs this in the web container while the control app is
// stopped: tsx, because Bun has no node:sqlite. The paths are the app's
// runtimeConfig defaults (nuxt.config.ts).
const drupalRoot = fileURLToPath(new URL('../../drupal', import.meta.url))
const dataDirectory =
  process.env.NUXT_DATA_DIRECTORY ??
  fileURLToPath(new URL('../.data', import.meta.url))

const plan = await deploySandboxes(
  databaseFile(dataDirectory),
  async (...args) =>
    // drush logs to stderr: the deploy shows it.
    execFileSync(`${drupalRoot}/vendor/bin/drush`, args, {
      cwd: drupalRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    }),
  now(),
)
console.log(
  `Updated ${plan.update.length} premium sandboxes, deleted ${plan.delete.length} others.`,
)
