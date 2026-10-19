// The control app: the claim page, the premium invitations and access links,
// the admin pages, and the cleanup of expired sandboxes. It runs inside ddev as
// the "control" daemon (`ddev nuxt control`), behind nginx at
// https://blokkli-control.ddev.site: the dev server locally, the production
// build (`bun run sandbox:build`) when hosted.
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  // Blockingen's design system and fonts, from the sandbox frontend.
  css: [
    '@fontsource-variable/source-sans-3/wght.css',
    '@fontsource-variable/source-serif-4/opsz.css',
    '~/assets/css/main.css',
  ],

  // Secrets and keys come from the environment (.ddev/.env.web), e.g.
  // NUXT_ADMIN_PASSWORD for adminPassword.
  runtimeConfig: {
    // Signs the sandbox logins; settings.php reads the same variable. The
    // fallback is public, as Drupal's: the hosted site sets its own.
    sandboxLoginSecret: 'blokkli-local-development',
    // The admin pages' basic auth. Empty: open locally, closed when hosted.
    adminPassword: '',
    // Turnstile on the claim page. Empty: no captcha.
    turnstileSecretKey: '',
    // The Drupal site (its drush and its sandboxes).
    drupalRoot: fileURLToPath(new URL('../drupal', import.meta.url)),
    // The app's database: sandboxes, invitations and access links.
    dataDirectory: fileURLToPath(new URL('./.data', import.meta.url)),
    claimsPerIpPerHour: 3,
    maxActiveSandboxes: 100,
    public: {
      turnstileSiteKey: '',
    },
  },

  nitro: {
    // Node's own SQLite (server/utils/db.ts), which Nitro doesn't know as a
    // built-in module yet.
    rollupConfig: {
      external: ['node:sqlite'],
    },
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      '*/5 * * * *': ['sandbox:cleanup'],
    },
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      // Requests arrive through nginx with the control app's host, which Vite
      // would otherwise reject.
      allowedHosts: true,
    },
  },

  typescript: {
    strict: true,
  },

  $production: {
    // A build empties its build directory first: its own, so that it can run
    // next to the dev server.
    buildDir: 'node_modules/.cache/nuxt-production',
  },

  compatibilityDate: '2026-10-02',
})
