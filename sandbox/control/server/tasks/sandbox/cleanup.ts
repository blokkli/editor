import { defineTask } from '#imports'
import { getDatabase, now, type SandboxRow } from '../../utils/db'
import { drush } from '../../utils/drush'
import { expires, sandboxExists } from '../../utils/sandboxes'

/**
 * Deletes the expired sandboxes, every 5 minutes (nuxt.config.ts). Only those
 * in the database: sandboxes made with drush (dev, E2E) stay.
 */
export default defineTask({
  meta: {
    name: 'sandbox:cleanup',
    description: 'Deletes the expired sandboxes.',
  },
  async run() {
    const database = getDatabase()
    const time = now()
    const markDeleted = database.prepare(
      'UPDATE sandboxes SET deleted = ? WHERE id = ?',
    )
    const sandboxes = database
      .prepare('SELECT * FROM sandboxes WHERE deleted IS NULL')
      .all() as SandboxRow[]
    const deleted: string[] = []
    for (const sandbox of sandboxes) {
      if (!sandboxExists(sandbox.id)) {
        // Gone already (a deploy, drush), unless it's still being created.
        if (sandbox.created < time - 60) {
          markDeleted.run(time, sandbox.id)
        }
        continue
      }
      if (expires(sandbox) > time) {
        continue
      }
      try {
        await drush('blokkli-sandbox:delete', sandbox.id)
      } catch (error) {
        console.error(`Couldn't delete the sandbox ${sandbox.id}:`, error)
        continue
      }
      markDeleted.run(now(), sandbox.id)
      deleted.push(sandbox.id)
    }
    return { result: { deleted } }
  },
})
