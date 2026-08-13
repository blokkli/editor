// Demonstrates the per-site runtime null-override for chart colorOptions.
//
// At build time, `nuxt.config.ts` declares the full universe of colors
// (the "superset"). Each consuming site can then disable specific colors
// here by setting them to `null` — they disappear from the editor's chart
// ColorDropdown and from agent tool validation. Sites that need all
// declared colors can simply leave this file empty or remove the override.
export default defineAppConfig({
  blokkli: {
    colorOptions: {
      // Uncomment to disable a color for this site:
      // pink: null,
    },
  },
})
