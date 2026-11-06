import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { databaseFile, now } from '../server/utils/db'
import { deploySandboxes } from '../server/utils/deploySandboxes'

// `ddev deploy` runs this in the web container while the control app is
// stopped: tsx, because Bun has no node:sqlite. The paths are the app's
// runtimeConfig (nuxt.config.ts): its defaults, or the environment's.
const drupalRoot =
  process.env.NUXT_DRUPAL_ROOT ??
  fileURLToPath(new URL('../../drupal', import.meta.url))
const dataDirectory =
  process.env.NUXT_DATA_DIRECTORY ??
  fileURLToPath(new URL('../.data', import.meta.url))

const result = await deploySandboxes(
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
  `Updated ${result.updated.length} premium sandboxes, deleted ${result.deleted.length} others.`,
)
if (result.failed.length) {
  // The deploy finishes, then fails.
  console.error(
    `Failed: ${result.failed.join(', ')} (above). The next deploy tries them again.`,
  )
  process.exitCode = 1
}
