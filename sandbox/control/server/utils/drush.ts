import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

/**
 * Runs a drush command on the default site, e.g. blokkli-sandbox:create.
 */
export async function drush(...args: string[]): Promise<void> {
  const { drupalRoot } = useRuntimeConfig()
  await run(`${drupalRoot}/vendor/bin/drush`, args, { cwd: drupalRoot })
}
