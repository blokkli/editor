import { execFileSync } from 'node:child_process'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  ROOT,
  resetSandbox,
  sandboxHost,
  workerSandbox,
} from './support/sandbox'

function drush(...args: string[]): string {
  return execFileSync('ddev', ['drush', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim()
}

// What `ddev deploy` runs on a premium sandbox: `drush deploy` on its own
// SQLite database, with a pending update that changes a table's schema.
describe('Updating a sandbox', () => {
  const sandbox = workerSandbox()
  const uri = `--uri=${sandboxHost(sandbox)}`
  let pending = ''

  beforeAll(() => {
    resetSandbox(sandbox)
    drush(uri, 'pm:install', 'blokkli_sandbox_update_test', '-y')
    drush(
      uri,
      'php:eval',
      "\\Drupal::service('update.update_hook_registry')->setInstalledVersion('blokkli_sandbox_update_test', 11000);",
    )
    drush(uri, 'config:set', 'system.site', 'slogan', 'Changed', '-y')
    pending = drush(uri, 'updatedb:status', '--format=json')
    drush('blokkli-sandbox:update', sandbox)
  }, 120_000)

  it('runs the pending update', () => {
    expect(pending).toContain('blokkli_sandbox_update_test_update_11001')
    expect(drush(uri, 'state:get', 'blokkli_sandbox_update_test.note')).toBe(
      'updated',
    )
    // drush prints no list when nothing is pending.
    expect(drush(uri, 'updatedb:status', '--format=json')).toBe('')
  })

  it('imports the config', () => {
    expect(drush(uri, 'config:get', 'system.site', 'slogan')).toBe(
      "'system.site:slogan': ''",
    )
  })

  it('refuses a sandbox that does not exist', () => {
    expect(() => drush('blokkli-sandbox:update', 'nosuchsandbox')).toThrow()
  })
})
