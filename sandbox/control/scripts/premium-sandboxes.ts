import { fileURLToPath } from 'node:url'
import { premiumSandboxIds } from '../server/utils/premiumSandboxes'

// sandbox/drupal/sandboxes, next to the control app.
const directory = fileURLToPath(
  new URL('../../drupal/sandboxes', import.meta.url),
)
for (const id of premiumSandboxIds(directory)) {
  console.log(id)
}
