import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
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
    vi.restoreAllMocks()
  })

  function insertRows(...rows: [id: string, premium: number][]) {
    const database = openDatabase(file)
    const insert = database.prepare(
      'INSERT INTO sandboxes (id, source, premium, created) VALUES (?, ?, ?, ?)',
    )
    for (const [id, premium] of rows) {
      insert.run(id, 'en', premium, time - 3600)
    }
    database.close()
  }

  function deletedColumn() {
    return openDatabase(file)
      .prepare('SELECT id, deleted FROM sandboxes ORDER BY id')
      .all()
  }

  // A drush that fails the given command on the given sandbox.
  function failing(command: string, id: string) {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    return async (...args: string[]) => {
      const output = await drush(...args)
      if (args[0] === command && args[1] === id) {
        throw new Error(`${command} failed`)
      }
      return output
    }
  }

  test('deletes the others, updates the premium ones', async () => {
    insertRows(['p1', 1], ['n1', 0])
    onDisk = ['n1', 'p1', 'e2e1']

    expect(await deploySandboxes(file, drush, time)).toEqual({
      updated: ['p1'],
      deleted: ['n1', 'e2e1'],
      failed: [],
    })
    expect(calls).toEqual([
      ['blokkli-sandbox:list', '--format=json'],
      ['blokkli-sandbox:delete', 'n1'],
      ['blokkli-sandbox:delete', 'e2e1'],
      ['blokkli-sandbox:update', 'p1'],
    ])
    expect(deletedColumn()).toEqual([
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

  // A sandbox whose data breaks an update would otherwise stop every deploy
  // at the same place.
  test('updates the others after a failed update', async () => {
    insertRows(['p1', 1], ['p2', 1])
    onDisk = ['p1', 'p2']

    expect(
      await deploySandboxes(
        file,
        failing('blokkli-sandbox:update', 'p1'),
        time,
      ),
    ).toEqual({ updated: ['p2'], deleted: [], failed: ['p1'] })
    expect(calls).toEqual([
      ['blokkli-sandbox:list', '--format=json'],
      ['blokkli-sandbox:update', 'p1'],
      ['blokkli-sandbox:update', 'p2'],
    ])
  })

  test('keeps the row of a sandbox it fails to delete, and goes on', async () => {
    insertRows(['n1', 0], ['n2', 0], ['p1', 1])
    onDisk = ['n1', 'n2', 'p1']

    expect(
      await deploySandboxes(
        file,
        failing('blokkli-sandbox:delete', 'n1'),
        time,
      ),
    ).toEqual({ updated: ['p1'], deleted: ['n2'], failed: ['n1'] })
    expect(deletedColumn()).toEqual([
      { id: 'n1', deleted: null },
      { id: 'n2', deleted: time },
      { id: 'p1', deleted: null },
    ])
  })
})
