import { existsSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'
import { openDatabase, type SandboxRow } from './db'
import { expires } from './sandboxes'

export type DeployPlan = {
  update: string[]
  delete: string[]
}

/**
 * What a deploy did. A sandbox whose drush command failed is in `failed` only.
 */
export type DeployResult = {
  updated: string[]
  deleted: string[]
  failed: string[]
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
      // Only premium rows: a normal row's expiry reads its last use, through
      // the app's runtimeConfig, which the deploy's script runs without.
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
 * then updates the others (`blokkli-sandbox:update`). A sandbox whose deletion
 * or update fails stays as it is, and the others go on: a broken sandbox
 * doesn't hold up the rest. The next deploy tries it again.
 */
export async function deploySandboxes(
  databaseFile: string,
  drush: Drush,
  time: number,
): Promise<DeployResult> {
  const ids = await listSandboxes(drush)
  if (!ids.length) {
    return { updated: [], deleted: [], failed: [] }
  }
  const database = openExistingDatabase(databaseFile)
  try {
    const rows = database
      .prepare('SELECT * FROM sandboxes')
      .all() as SandboxRow[]
    const plan = deployPlan(ids, rows, time)
    const deleted = await deleteSandboxes(database, drush, plan.delete, time)
    const updated = await updateSandboxes(drush, plan.update)
    const done = new Set([...deleted, ...updated])
    return { updated, deleted, failed: ids.filter((id) => !done.has(id)) }
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
 * Deletes sandboxes and marks their rows, one after the other. Returns those
 * deleted: one that fails keeps its row as it was.
 */
async function deleteSandboxes(
  database: DatabaseSync,
  drush: Drush,
  ids: string[],
  time: number,
): Promise<string[]> {
  const markDeleted = database.prepare(
    'UPDATE sandboxes SET deleted = ? WHERE id = ? AND deleted IS NULL',
  )
  const deleted: string[] = []
  for (const id of ids) {
    if (await succeeds(drush, 'blokkli-sandbox:delete', id)) {
      markDeleted.run(time, id)
      deleted.push(id)
    }
  }
  return deleted
}

/**
 * Updates premium sandboxes, one after the other. Returns those updated.
 */
async function updateSandboxes(drush: Drush, ids: string[]): Promise<string[]> {
  const updated: string[] = []
  for (const id of ids) {
    if (await succeeds(drush, 'blokkli-sandbox:update', id)) {
      updated.push(id)
    }
  }
  return updated
}

/**
 * Runs a drush command on a sandbox. A failure is logged, not thrown: drush
 * printed its output already.
 */
async function succeeds(
  drush: Drush,
  command: string,
  id: string,
): Promise<boolean> {
  try {
    await drush(command, id)
    return true
  } catch (error) {
    console.error(
      `${command} ${id} failed:`,
      error instanceof Error ? error.message : error,
    )
    return false
  }
}
