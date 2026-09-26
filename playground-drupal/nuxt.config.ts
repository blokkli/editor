// The Nuxt app for the Drupal playground. It runs inside ddev as the "nuxt"
// daemon (`ddev nuxt`), behind nginx at https://blokkli.ddev.site.
// Minimal for now; plans/drupal-setup/06-playground-drupal-app.md builds it out.
export default defineNuxtConfig({
  imports: {
    autoImport: false,
  },
  vite: {
    server: {
      // Requests arrive through nginx with the site's Host (and, later, the
      // sandbox subdomains), which Vite would otherwise reject.
      allowedHosts: true,
    },
  },
  typescript: {
    strict: true,
  },
  compatibilityDate: '2026-09-26',
})
