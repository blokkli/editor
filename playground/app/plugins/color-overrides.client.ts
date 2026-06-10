/**
 * Runtime demonstration of the chart `colorOptions` override mechanism.
 *
 * The build-time `colorOptions` in `nuxt.config.ts` defines the full universe
 * of colors available to charts. Each site can then override entries at
 * runtime via `app.config` (this plugin, or a static `app.config.ts`):
 *
 *  - `null`  → disable the color entirely. For ramped colors, this hides the
 *              entire color and all its shades from the editor's
 *              ColorDropdown and from agent tool validation.
 *  - `string` → hex override for the canonical/base swatch. For ramped colors
 *              this replaces the `mainShade` hex while keeping all other
 *              declared shades intact.
 *  - (omit) → fall back to the build-time value.
 *
 * The cases below match what we implemented:
 *   - purple: disabled
 *   - green:  hex overridden (slightly brighter)
 *   - everything else: untouched
 */
export default defineNuxtPlugin(() => {
  // Nuxt infers the appConfig type from the `inlineConfig` JSON literal in
  // `.nuxt/types/app.config.d.ts`, which captures the build-time hex strings
  // verbatim — there's no `null` in that literal, so the inferred map type is
  // `Record<string, string>`. The actual runtime contract (set by the module
  // at `src/module.ts`) is `Record<string, string | null>`. Cast to the
  // runtime contract here.
  updateAppConfig({
    blokkli: {
      colorOptions: {
        // Disable a flat color entirely — disappears from ColorDropdown.
        purple: null,

        // Hex override for a flat color — base swatch shifts to this hex.
        green: '#22c55e',

        // Flip these to test more cases:
        //
        // Disable a ramped color → all its shades disappear with it:
        // red: null,
        //
        // Override the base hex of a ramped color → mainShade swatch shifts,
        // other declared shades keep their declared hexes:
        // red: '#7f0000',
      } as Record<string, string | null>,
    },
  })
})
