import { randomInt } from 'node:crypto'
import { existsSync, statSync } from 'node:fs'
import {
  LANGUAGES,
  type Language,
} from '../../../frontend/shared/utils/languages'
import type { SandboxRow } from './db'

const HOUR = 3600

// A sandbox lives 24 hours at most and expires after 2 hours unused. A premium
// one lives 7 days.
export const LIFETIME = {
  normal: 24 * HOUR,
  idle: 2 * HOUR,
  premium: 7 * 24 * HOUR,
}

// The seeded editor (sandbox/drupal/content/users.yml).
export const SANDBOX_USER = 'Anna Keller'

const ID_CHARACTERS = 'abcdefghijklmnopqrstuvwxyz0123456789'

/**
 * A new sandbox id: 10 random characters, about 51 bits. Ids must be
 * unguessable: a sandbox's public files are readable by their path.
 */
export function createSandboxId(): string {
  return Array.from(
    { length: 10 },
    () => ID_CHARACTERS[randomInt(ID_CHARACTERS.length)],
  ).join('')
}

/**
 * The directory of a sandbox's database (blokkli_sandbox's SandboxManager).
 */
export function sandboxDirectory(id: string): string {
  return `${useRuntimeConfig().drupalRoot}/sandboxes/${id}`
}

/**
 * Whether a sandbox exists: nginx and settings.php ask the same.
 */
export function sandboxExists(id: string): boolean {
  return existsSync(`${sandboxDirectory(id)}/db.sqlite`)
}

/**
 * The languages with a template, which `ddev bake --source=<language>`
 * writes.
 */
export function availableSources(): Language[] {
  const { drupalRoot } = useRuntimeConfig()
  return LANGUAGES.filter((language) =>
    existsSync(`${drupalRoot}/sandboxes/_template/${language}/db.sqlite`),
  )
}

/**
 * A sandbox's URL: its id as a subdomain of the wildcard hostname in
 * DDEV_HOSTNAME (*.blokkli.ddev.site), as settings.php reads it.
 */
export function sandboxUrl(id: string): string {
  const wildcard = (process.env.DDEV_HOSTNAME ?? '')
    .split(',')
    .find((hostname) => hostname.startsWith('*.'))
  if (!wildcard) {
    throw new Error('DDEV_HOSTNAME has no wildcard hostname for sandboxes.')
  }
  return `https://${id}.${wildcard.slice(2)}`
}

/**
 * When a sandbox was last used: Drupal touches its file "last-use" at most
 * once a minute (LastUseSubscriber). Without one, when it was created.
 */
export function lastUse(sandbox: SandboxRow): number {
  const file = `${sandboxDirectory(sandbox.id)}/last-use`
  return existsSync(file)
    ? Math.floor(statSync(file).mtimeMs / 1000)
    : sandbox.created
}

/**
 * When a sandbox expires.
 */
export function expires(sandbox: SandboxRow): number {
  if (sandbox.premium) {
    return sandbox.created + LIFETIME.premium
  }
  return Math.min(
    sandbox.created + LIFETIME.normal,
    lastUse(sandbox) + LIFETIME.idle,
  )
}
