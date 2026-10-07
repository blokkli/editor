import type { Language } from './languages'

// The welcome page (app/pages/welcome.vue) in each language: the control app
// opens it after a claim. Its definePageMeta repeats the paths, because Nuxt
// reads them from the source at build time.
export const WELCOME_PATHS: Record<Language, string> = {
  en: '/en/welcome',
  de: '/de/willkommen',
  fr: '/fr/bienvenue',
}
