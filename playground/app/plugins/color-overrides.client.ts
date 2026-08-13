/**
 * Runtime demonstration of the chart `colorOptions` override mechanism.
 *
 * The build-time `colorOptions` in `nuxt.config.ts` defines the full universe
 * of colors available to charts. Each site can then override entries at
 * runtime via `app.config` (this plugin, or a static `app.config.ts`):
 *
 *  - `<id>: null`           → disable the color entirely. For ramped colors,
 *                             this hides the whole family.
 *  - `<id>: '#hex'`         → flat color: replace the hex. Ramped color:
 *                             replace just the main/canonical shade's hex.
 *  - `<id>.<shade>: '#hex'` → ramped color only: replace just that shade's
 *                             hex. The rest of the ramp is untouched.
 *  - `<id>.<shade>: null`   → ramped color only: remove just that shade. If
 *                             the main shade is removed (or every shade is
 *                             removed), the family is disabled.
 *  - (omit)                 → fall back to the build-time value.
 *
 * Composition: `<id>: null` always wins; shade overrides are ignored when
 * the family is off. A more-specific `<id>.<mainShade>: '#hex'` beats a bare
 * `<id>: '#hex'` for the main shade.
 *
 * Examples below mix several cases at once.
 */
export default defineNuxtPlugin(() => {
  // Nuxt infers the appConfig type from the seeded JSON literal in
  // `.nuxt/types/app.config.d.ts`, which doesn't include `null`. The runtime
  // contract (set by the module at `src/module.ts`) is
  // `Record<string, string | null>`. Cast to match.
  updateAppConfig({
    blokkli: {
      colorOptions: {
        // Flat color, disabled — disappears from the ColorDropdown.
        purple: undefined,

        // Flat color, hex overridden.
        green: '#22c55e',

        // Ramped color, override a single non-main shade.
        'red.300': '#fed7d7',

        // Ramped color, remove a single non-main shade — the ramp shrinks
        // but the family stays.
        'red.700': undefined,

        // Flip these to test more cases:
        //
        // Disable a whole ramped color (wins over shade overrides):
        // red: null,
        //
        // Override the canonical (main) shade of a ramped color — equivalent
        // to bare `red: '#hex'`, but more specific:
        // 'red.500': '#7f0000',
        //
        // Remove the main shade → family is disabled:
        // 'red.500': null,
      },
    },
  })
})
