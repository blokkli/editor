import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  openDatabase,
  type SandboxRow,
} from '../../sandbox/control/server/utils/db'
import {
  deployPlan,
  deploySandboxes,
} from '../../sandbox/control/server/utils/deploySandboxes'
import { LIFETIME } from '../../sandbox/control/server/utils/sandboxes'

// What `ddev deploy` does with the sandboxes: it updates the premium ones the
// cleanup keeps and deletes the others.
const time = 1_800_000_000

function row(id: string, values: Partial<SandboxRow> = {}): SandboxRow {
  return {
    id,
    source: 'en',
    premium: 1,
    created: time - 3600,
    deleted: null,
    ip_hash: null,
    invitation: null,
    ...values,
  }
}

describe('deployPlan', () => {
  test('updates a live premium sandbox', () => {
    expect(deployPlan(['p1'], [row('p1')], time)).toEqual({
      update: ['p1'],
      delete: [],
    })
  })

  test('deletes a normal sandbox', () => {
    expect(deployPlan(['n1'], [row('n1', { premium: 0 })], time)).toEqual({
      update: [],
      delete: ['n1'],
    })
  })

  test('deletes a sandbox without a row, as drush makes them', () => {
    expect(deployPlan(['e2e1'], [], time)).toEqual({
      update: [],
      delete: ['e2e1'],
    })
  })

  test('deletes a premium sandbox past its lifetime', () => {
    const created = time - LIFETIME.premium - 1
    expect(deployPlan(['p1'], [row('p1', { created })], time)).toEqual({
      update: [],
      delete: ['p1'],
    })
  })

  test('deletes a premium sandbox whose row is marked deleted', () => {
    expect(
      deployPlan(['p1'], [row('p1', { deleted: time - 60 })], time),
    ).toEqual({ update: [], delete: ['p1'] })
  })

  test('ignores rows of sandboxes that are gone', () => {
    expect(deployPlan([], [row('p1')], time)).toEqual({
      update: [],
      delete: [],
    })
  })
})

describe('deploySandboxes', () => {
  let directory: string
  let file: string
  let calls: string[][]
  let onDisk: string[]

  async function drush(...args: string[]): Promise<string> {
    calls.push(args)
    if (args[0] === 'blokkli-sandbox:list') {
      return JSON.stringify(
        onDisk.map((id) => ({ id, url: `https://${id}.blokkli.ddev.site` })),
      )
    }
    return ''
  }

  beforeEach(() => {
    directory = mkdtempSync(`${tmpdir()}/control-`)
    file = `${directory}/control.sqlite`
    calls = []
    onDisk = []
  })

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true })
  })

  test('deletes the others, updates the premium ones', async () => {
    const database = openDatabase(file)
    const insert = database.prepare(
      'INSERT INTO sandboxes (id, source, premium, created) VALUES (?, ?, ?, ?)',
    )
    insert.run('p1', 'en', 1, time - 3600)
    insert.run('n1', 'en', 0, time - 3600)
    database.close()
    onDisk = ['n1', 'p1', 'e2e1']

    await deploySandboxes(file, drush, time)

    expect(calls).toEqual([
      ['blokkli-sandbox:list', '--format=json'],
      ['blokkli-sandbox:delete', 'n1'],
      ['blokkli-sandbox:delete', 'e2e1'],
      ['blokkli-sandbox:update', 'p1'],
    ])
    const rows = openDatabase(file)
      .prepare('SELECT id, deleted FROM sandboxes ORDER BY id')
      .all()
    expect(rows).toEqual([
      { id: 'n1', deleted: time },
      { id: 'p1', deleted: null },
    ])
  })

  test("refuses to delete sandboxes without the control app's database", async () => {
    onDisk = ['p1']
    await expect(deploySandboxes(file, drush, time)).rejects.toThrow(
      /control app's database/,
    )
    expect(calls).toEqual([['blokkli-sandbox:list', '--format=json']])
  })

  test('needs no database without sandboxes', async () => {
    await deploySandboxes(file, drush, time)
    expect(calls).toEqual([['blokkli-sandbox:list', '--format=json']])
  })

  test('stops at a failed update', async () => {
    const database = openDatabase(file)
    database
      .prepare(
        'INSERT INTO sandboxes (id, source, premium, created) VALUES (?, ?, ?, ?)',
      )
      .run('p1', 'en', 1, time - 3600)
    database.close()
    onDisk = ['p1']
    const failing = async (...args: string[]) => {
      if (args[0] === 'blokkli-sandbox:update') {
        throw new Error('updatedb failed')
      }
      return drush(...args)
    }
    await expect(deploySandboxes(file, failing, time)).rejects.toThrow(
      'updatedb failed',
    )
  })
})
