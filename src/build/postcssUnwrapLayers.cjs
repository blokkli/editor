/**
 * Unwrap Tailwind-named cascade layers (`base`, `components`, `utilities`,
 * `theme`, `properties`) so the published CSS is flat (unlayered).
 *
 * Why: when blökkli's CSS is consumed by a Tailwind v3 host, two problems
 * arise from leaving our content inside named layers:
 *
 * 1. Tailwind v3's PostCSS pipeline runs a normalize check that errors on
 *    `@layer base|components|utilities` blocks unless the host also has a
 *    matching `@tailwind base|components|utilities` directive — which the
 *    host doesn't, because we ship pre-compiled CSS.
 * 2. Layer cascade ordering is host-vs-us. The host's preflight emits to
 *    `@layer base { button { ... } }`. If we keep our scoped preflight in
 *    any* layer, the layer cascade rules (later-declared layer wins, and
 *    unlayered always beats layered) decide the fight, not specificity.
 *    Renamed `bk-base` loses to host `base` whenever host CSS is loaded
 *    after ours. Unlayered always wins.
 *
 * Solution: drop the wrapping at-rule for the 5 known Tailwind-emitted
 * layer names, promoting their child rules to the same nesting level. The
 * relative source order is preserved, so internal cascade (preflight <
 * components < utilities) still works via document order — Tailwind 4
 * already emits its layers in cascade order.
 *
 * Standalone declarations like `@layer theme, base, components, utilities;`
 * are dropped entirely (they only matter when those layers exist as
 * blocks).
 */

const KNOWN = new Set([
  'theme',
  'base',
  'components',
  'utilities',
  'properties',
])

const plugin = () => ({
  postcssPlugin: 'postcss-unwrap-blokkli-layers',
  Once(root) {
    const toUnwrap = []
    const toRemove = []

    root.walkAtRules('layer', (atRule) => {
      // Standalone `@layer a, b, c;` (no body): drop if all names known.
      if (!atRule.nodes) {
        const names = atRule.params
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        if (names.length && names.every((n) => KNOWN.has(n))) {
          toRemove.push(atRule)
        }
        return
      }
      // Block form: unwrap if name is one we control.
      if (KNOWN.has(atRule.params.trim())) {
        toUnwrap.push(atRule)
      }
    })

    for (const r of toUnwrap) r.replaceWith(r.nodes)
    for (const r of toRemove) r.remove()
  },
})

plugin.postcss = true
module.exports = plugin
