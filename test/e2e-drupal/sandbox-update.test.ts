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

// A module's translation file that changed since the bake: paragraphs_blokkli's
// German one, without one of its strings in the database.
const FORGET_TRANSLATION = [
  '$database = \\Drupal::database();',
  "$database->update('locale_file')->fields(['hash' => 'outdated'])->condition('project', 'paragraphs_blokkli')->condition('langcode', 'de')->execute();",
  "$lid = $database->select('locales_source', 's')->fields('s', ['lid'])->condition('source', 'Someone')->condition('context', '')->execute()->fetchField();",
  "$database->delete('locales_target')->condition('lid', $lid)->condition('language', 'de')->execute();",
  "\\Drupal\\Core\\Cache\\Cache::invalidateTags(['locale']);",
].join(' ')

// What `ddev deploy` runs on a premium sandbox: `drush deploy` on its own
// SQLite database, with a pending update that changes a table's schema, and
// the import of the translation files that changed.
describe('Updating a sandbox', () => {
  const sandbox = workerSandbox()
  const uri = `--uri=${sandboxHost(sandbox)}`
  let pending = ''
  let translation = ''
  let forgotten = ''

  function translate(): string {
    return drush(
      uri,
      'php:eval',
      "echo t('Someone', [], ['langcode' => 'de']);",
    )
  }

  beforeAll(() => {
    resetSandbox(sandbox)
    drush(uri, 'pm:install', 'blokkli_sandbox_update_test', '-y')
    drush(
      uri,
      'php:eval',
      "\\Drupal::service('update.update_hook_registry')->setInstalledVersion('blokkli_sandbox_update_test', 11000);",
    )
    drush(uri, 'config:set', 'system.site', 'slogan', 'Changed', '-y')
    translation = translate()
    drush(uri, 'php:eval', FORGET_TRANSLATION)
    forgotten = translate()
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

  it('imports the translation files that changed', () => {
    expect(translation).not.toBe('Someone')
    expect(forgotten).toBe('Someone')
    expect(translate()).toBe(translation)
  })

  it('refuses a sandbox that does not exist', () => {
    expect(() => drush('blokkli-sandbox:update', 'nosuchsandbox')).toThrow()
  })
})
