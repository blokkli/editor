import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'

// The same id pattern as nginx and settings.php.
const ID = /^[a-z0-9]{2,32}$/

/**
 * The premium sandboxes in a sandboxes directory.
 *
 * "premium" is true in lifetime.json, the flag settings.php reads to decide
 * whether the sandbox gets the agent. ddev deploy updates these and deletes
 * the others. An unreadable file throws: a deploy must stop rather than treat
 * that sandbox as not premium and delete it.
 */
export function premiumSandboxIds(directory: string): string[] {
  if (!existsSync(directory)) {
    return []
  }
  const ids: string[] = []
  for (const id of readdirSync(directory)) {
    if (!ID.test(id)) {
      continue
    }
    const file = `${directory}/${id}/lifetime.json`
    if (!existsSync(file) || !statSync(file).isFile()) {
      continue
    }
    let lifetime: unknown
    try {
      lifetime = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      throw new Error(`The lifetime of the sandbox '${id}' isn't valid JSON.`)
    }
    if (
      typeof lifetime === 'object' &&
      lifetime !== null &&
      'premium' in lifetime &&
      lifetime.premium === true
    ) {
      ids.push(id)
    }
  }
  return ids.sort()
}
