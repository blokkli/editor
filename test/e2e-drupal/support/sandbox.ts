import { createHash } from 'node:crypto'
import {
  constants,
  copyFileSync,
  cpSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createLoginToken } from '../../../sandbox/control/server/utils/loginToken'

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const SANDBOXES = `${ROOT}sandbox/drupal/sandboxes`
const PUBLIC_FILES = `${ROOT}sandbox/drupal/web/sites/default/files/sandboxes`
export const TEMPLATE = `${SANDBOXES}/_template/e2e`

// settings.php's fallback, as long as .ddev/.env.web sets none.
const LOGIN_SECRET =
  process.env.NUXT_SANDBOX_LOGIN_SECRET || 'blokkli-local-development'

/**
 * The sandbox of this vitest worker: one per worker, so that spec files
 * running in parallel never share one.
 */
export function workerSandbox(): string {
  return `e2e${process.env.VITEST_POOL_ID ?? '1'}`
}

export function sandboxHost(id: string): string {
  return `https://${id}.blokkli.ddev.site`
}

/**
 * Makes the sandbox a fresh copy of the E2E template, whether it exists or
 * not: what `ddev reset` does for the dev site. Plain file copies on the host
 * (the repository is mounted into the container), no PHP. Nothing may write to
 * the sandbox meanwhile: close its pages first.
 *
 * Returns the time it took, in ms.
 */
export function resetSandbox(id: string): number {
  const start = performance.now()
  const directory = `${SANDBOXES}/${id}`
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(`${directory}/db.sqlite${suffix}`, { force: true })
  }
  for (const subdirectory of ['private', 'tmp']) {
    rmSync(`${directory}/${subdirectory}`, { recursive: true, force: true })
    mkdirSync(`${directory}/${subdirectory}`, { recursive: true })
  }
  rmSync(`${PUBLIC_FILES}/${id}`, { recursive: true, force: true })
  cpSync(`${TEMPLATE}/files`, `${PUBLIC_FILES}/${id}`, { recursive: true })
  // The marker makes it an E2E sandbox for settings.php: its test modules
  // work, and it never gets DeepL's key. Premium, as
  // `blokkli-sandbox:create --premium` makes one: with the agent.
  writeFileSync(`${directory}/e2e`, '')
  writeFileSync(
    `${directory}/lifetime.json`,
    JSON.stringify({ expires: null, idle: null, premium: true }),
  )
  // Last, and under another name first: a sandbox with a database is a
  // complete one for nginx and settings.php (as in SandboxManager::create()).
  copyFileSync(
    `${TEMPLATE}/db.sqlite`,
    `${directory}/db.sqlite.tmp`,
    constants.COPYFILE_FICLONE,
  )
  renameSync(`${directory}/db.sqlite.tmp`, `${directory}/db.sqlite`)
  return performance.now() - start
}

/**
 * The path that logs a user into the sandbox, then redirects to the
 * destination: blokkli_sandbox's login, with a token signed like the control
 * app's.
 */
export function loginPath(
  sandbox: string,
  user: string,
  destination: string,
): string {
  const expires = Math.floor(Date.now() / 1000) + 600
  const token = createLoginToken(LOGIN_SECRET, sandbox, user, expires)
  return `/blokkli-sandbox/login/${token}?destination=${encodeURIComponent(destination)}`
}

/**
 * The UUID the seed gives an entity: version 5 of `<entity type>:<key>`
 * (Seeder::uuid()).
 */
export function seedUuid(entityType: string, key: string): string {
  const namespace = Buffer.from(
    'b10c4e1f-5eed-4c0d-9a1e-3b7c2f6d8e90'.replaceAll('-', ''),
    'hex',
  )
  const hash = createHash('sha1')
    .update(namespace)
    .update(`${entityType}:${key}`)
    .digest('hex')
  const variant = ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(
    16,
  )
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `5${hash.slice(13, 16)}`,
    `${variant}${hash.slice(18, 20)}`,
    hash.slice(20, 32),
  ].join('-')
}
