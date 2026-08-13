import { computed, useAppConfig, type ComputedRef } from '#imports'
import { colorPalette as canonicalPalette } from '#blokkli-build/config'
import { FALLBACK_HEX } from '../helpers/colors'

type UseBlokkliRuntimeConfig = {
  /**
   * Resolve a canonical color id to its current hex.
   *
   * Reads `app.config.blokkli.colorOptions` first; if the id is missing,
   * disabled (null override on the id itself or its `<base>`), or null
   * /undefined to begin with, cascades through `colorPalette` in order
   * and returns the first that resolves. Falls back to `FALLBACK_HEX`
   * only when every palette entry is also gone.
   */
  resolveColorHex: (id: string | null | undefined) => string

  /**
   * Ordered canonical color ids with disabled entries already filtered
   * out — a `<base>: null` family-disable drops `<base>.<mainShade>`,
   * a direct `<id>: null` drops that id. Cycle through this for default
   * color assignment (e.g. dynamic chart series).
   */
  colorPalette: ComputedRef<string[]>
}

/**
 * Runtime-only config surface for userland and integrator components
 * (chart renderers, custom blocks, …) outside the editor.
 *
 * Sources:
 *   - `app.config.blokkli.colorOptions` — flat `Record<canonicalId, string | null>`
 *     seeded by the module with every canonical id (bare for flat colors,
 *     `<base>.<shade>` for ramped colors) at its build-time hex. `null`
 *     disables. The bare `<base>` is kept for ramped colors so userland
 *     can family-disable with `<base>: null`. This is the user-overridable
 *     surface — `updateAppConfig` deep-merges into it.
 *   - `#blokkli-build/config` → `colorPalette` — ordered canonical ids
 *     (one per declared family — flat ids verbatim, ramped ids as
 *     `<base>.<mainShade>`). Build-time static data, NOT in appConfig
 *     because it's not userland-overridable. Used as the cascading
 *     fallback for unresolved ids.
 *
 * Returns:
 *   - `resolveColorHex(id)` — flat lookup. If the requested id is missing
 *     or disabled, cascade through the enabled palette in order and return
 *     the first one that resolves. If even that yields nothing, return
 *     `FALLBACK_HEX`.
 *   - `colorPalette` — computed ordered canonical ids with disabled
 *     entries already filtered out (a `<base>: null` family-disable drops
 *     `<base>.<mainShade>`; a direct `<id>: null` drops that id). Userland
 *     can cycle through this directly to assign default colors — no need
 *     to second-guess which ids are still live.
 */
export function useBlokkliRuntimeConfig(): UseBlokkliRuntimeConfig {
  const appConfig = useAppConfig()

  // The auto-generated app.config type is strict (only declared keys);
  // widen for runtime string indexing. The runtime contract is
  // `Record<string, string | null>` (see `src/module.ts` seeding).
  const overrides = computed(
    () =>
      (appConfig.blokkli?.colorOptions ?? {}) as Record<
        string,
        string | null | undefined
      >,
  )

  function lookup(lookupId: string): string | undefined {
    const map = overrides.value
    const dotIndex = lookupId.indexOf('.')
    if (dotIndex !== -1) {
      const baseId = lookupId.slice(0, dotIndex)
      if (map[baseId] === null) return undefined
    }
    const value = map[lookupId]
    return typeof value === 'string' ? value : undefined
  }

  const colorPalette = computed(() =>
    canonicalPalette.filter((id) => lookup(id) !== undefined),
  )

  function resolveColorHex(id: string | null | undefined): string {
    if (id) {
      const direct = lookup(id)
      if (direct !== undefined) return direct
    }

    for (const fallbackId of colorPalette.value) {
      const hex = lookup(fallbackId)
      if (hex !== undefined) return hex
    }
    return FALLBACK_HEX
  }

  return { resolveColorHex, colorPalette }
}
