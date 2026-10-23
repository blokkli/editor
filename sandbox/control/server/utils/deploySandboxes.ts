import { existsSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'
import { openDatabase, type SandboxRow } from './db'
import { expires } from './sandboxes'

export type DeployPlan = {
  update: string[]
  delete: string[]
}

export type Drush = (...args: string[]) => Promise<string>

/**
 * What `ddev deploy` does with the sandboxes on disk: it updates the premium
 * ones the cleanup keeps and deletes the others, copies of the old templates.
 * Sandboxes without a row (made with drush) are deleted too.
 */
export function deployPlan(
  ids: string[],
  rows: SandboxRow[],
  time: number,
): DeployPlan {
  const kept = new Set(
    rows
      // Only premium rows: a normal row's expiry reads its last use.
      .filter((row) => row.premium && row.deleted === null)
      .filter((row) => expires(row) > time)
      .map((row) => row.id),
  )
  return {
    update: ids.filter((id) => kept.has(id)),
    delete: ids.filter((id) => !kept.has(id)),
  }
}

/**
 * Deletes the sandboxes that don't survive a deploy and marks their rows,
 * then runs `drush deploy` on the others. A failed update throws: the deploy
 * stops, and running it again retries.
 */
export async function deploySandboxes(
  databaseFile: string,
  drush: Drush,
  time: number,
): Promise<DeployPlan> {
  const ids = await listSandboxes(drush)
  if (!ids.length) {
    return { update: [], delete: [] }
  }
  const database = openExistingDatabase(databaseFile)
  try {
    const rows = database
      .prepare('SELECT * FROM sandboxes')
      .all() as SandboxRow[]
    const plan = deployPlan(ids, rows, time)
    await deleteSandboxes(database, drush, plan.delete, time)
    for (const id of plan.update) {
      await drush('blokkli-sandbox:update', id)
    }
    return plan
  } finally {
    database.close()
  }
}

/**
 * The ids of the sandboxes on disk, as Drupal lists them.
 */
async function listSandboxes(drush: Drush): Promise<string[]> {
  const listed = JSON.parse(
    await drush('blokkli-sandbox:list', '--format=json'),
  ) as { id: string }[]
  return listed.map((sandbox) => sandbox.id)
}

/**
 * The control app's database, which must exist: without it, there's no way to
 * tell the premium sandboxes from the others, and every one would be deleted.
 */
function openExistingDatabase(file: string): DatabaseSync {
  if (!existsSync(file)) {
    throw new Error(
      `The control app's database (${file}) is missing: there are sandboxes, and no way to tell the premium ones.`,
    )
  }
  return openDatabase(file)
}

/**
 * Deletes sandboxes and marks their rows, one after the other: a failure
 * leaves the rows of those not deleted yet as they were.
 */
async function deleteSandboxes(
  database: DatabaseSync,
  drush: Drush,
  ids: string[],
  time: number,
): Promise<void> {
  const markDeleted = database.prepare(
    'UPDATE sandboxes SET deleted = ? WHERE id = ? AND deleted IS NULL',
  )
  for (const id of ids) {
    await drush('blokkli-sandbox:delete', id)
    markDeleted.run(time, id)
  }
}
