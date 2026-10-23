import { defineNuxtPlugin } from '#imports'
import { config } from 'zod'

/**
 * zod compiles object schemas with `new Function`, after a probe that a strict
 * Content-Security-Policy reports even though zod catches it. Each schema reads
 * the setting when it's built, and the agent's are built as soon as anything in
 * the editor imports a tool: the setting comes first, when the app starts. It's
 * zod's global setting, so the project's schemas built from then on parse
 * without compiling too.
 */
export default defineNuxtPlugin(() => {
  config({ jitless: true })
})
