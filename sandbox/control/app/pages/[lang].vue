<template>
  <div class="min-h-screen bg-surface px-gutter py-section">
    <main
      class="mx-auto flex max-w-content flex-col gap-6 border border-line bg-white p-6 sm:p-10"
    >
      <div class="flex items-center gap-3">
        <Logo class="h-12 w-auto shrink-0" />
        <span class="flex flex-col">
          <span class="font-serif text-h3 font-semibold">{{ texts.site }}</span>
          <span class="text-small text-muted">blökkli sandbox</span>
        </span>
      </div>

      <h1 class="font-serif text-h1">{{ texts.title }}</h1>
      <p class="text-lead">{{ texts.intro }}</p>
      <p
        v-if="invitation"
        class="border-l-4 border-primary bg-primary-light px-4 py-3"
      >
        {{ texts.premium }}
      </p>
      <p v-else>{{ texts.lifetime }}</p>

      <nav aria-labelledby="language" class="mt-2 flex flex-col gap-3">
        <h2 id="language" class="text-h3">{{ texts.languageTitle }}</h2>
        <p class="text-small text-muted">{{ texts.languageDescription }}</p>
        <ul class="grid gap-3 sm:grid-cols-3">
          <li v-for="code in LANGUAGES" :key="code">
            <a
              v-if="sources.includes(code)"
              :href="`/${code}${invitationQuery}`"
              :lang="code"
              :aria-current="code === language ? 'page' : undefined"
              class="flex items-center gap-3 border-2 border-line px-4 py-3 font-semibold hover:border-primary aria-[current=page]:border-primary aria-[current=page]:bg-primary-light"
            >
              <span
                class="flex size-6 shrink-0 items-center justify-center border-2"
                :class="
                  code === language
                    ? 'border-primary bg-primary text-white'
                    : 'border-line bg-white'
                "
              >
                <svg
                  v-if="code === language"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  class="size-4"
                  aria-hidden="true"
                >
                  <path d="M5 12l5 5L19 7" />
                </svg>
              </span>
              {{ LANGUAGE_NAMES[code] }}
            </a>
            <span
              v-else
              :lang="code"
              class="flex cursor-not-allowed items-center gap-3 border-2 border-line px-4 py-3 font-semibold opacity-50"
            >
              <span class="size-6 shrink-0 border-2 border-line" />
              {{ LANGUAGE_NAMES[code] }}
            </span>
          </li>
        </ul>
      </nav>

      <form
        ref="form"
        class="flex flex-col items-start gap-6"
        @submit.prevent="submit"
      >
        <div
          v-if="hasTurnstile"
          class="cf-turnstile"
          :data-sitekey="turnstileSiteKey"
          :data-language="language"
        />

        <button
          type="submit"
          class="button"
          :disabled="pending || !hasTemplate"
        >
          {{ pending ? texts.pending : texts.submit }}
        </button>
        <p v-if="error" role="alert" class="text-error">
          {{ texts.errors[error] }}
        </p>
        <p v-else-if="!hasTemplate" class="text-error">
          {{ texts.errors.template }}
        </p>
      </form>
    </main>
  </div>
</template>

<script lang="ts" setup>
import {
  computed,
  definePageMeta,
  navigateTo,
  ref,
  useFetch,
  useHead,
  useRoute,
  useRuntimeConfig,
  useTemplateRef,
} from '#imports'
import Logo from '../../../frontend/app/components/Logo/index.vue'
import {
  isLanguage,
  LANGUAGE_NAMES,
  LANGUAGES,
  type Language,
} from '../../../frontend/shared/utils/languages'
import {
  DEFAULT_LANGUAGE,
  isClaimError,
  type ClaimError,
} from '../../shared/claim'
import { TEXTS } from '../texts'

// The claim page, in each language: /de, /fr, /en (server/middleware/language.ts
// redirects / here). The page's language is also the content's: the language
// boxes switch both. With ?invitation=…, it creates a premium sandbox.
definePageMeta({
  validate: (route) => isLanguage(route.params.lang),
})

const route = useRoute()
const language = computed<Language>(() =>
  isLanguage(route.params.lang) ? route.params.lang : DEFAULT_LANGUAGE,
)
const texts = computed(() => TEXTS[language.value])
const invitation = computed(() =>
  typeof route.query.invitation === 'string' ? route.query.invitation : '',
)
const invitationQuery = computed(() =>
  invitation.value ? `?invitation=${encodeURIComponent(invitation.value)}` : '',
)

// Without a site key, no captcha. Rendered implicitly by Cloudflare's script,
// which adds the field cf-turnstile-response to the form; the language links
// reload the page, so it renders again.
const { turnstileSiteKey } = useRuntimeConfig().public
const hasTurnstile = computed(() => !!turnstileSiteKey && !invitation.value)

useHead(() => ({
  title: texts.value.title,
  htmlAttrs: { lang: language.value },
  script: hasTurnstile.value
    ? [
        {
          src: 'https://challenges.cloudflare.com/turnstile/v0/api.js',
          async: true,
          defer: true,
        },
      ]
    : [],
}))

// The languages with a template: the others can't be the content's.
const { data: sources } = await useFetch('/api/templates', {
  default: (): Language[] => [],
})
const hasTemplate = computed(() => sources.value.includes(language.value))

const form = useTemplateRef('form')
const pending = ref(false)
const error = ref<ClaimError | null>(null)

async function submit() {
  pending.value = true
  error.value = null
  try {
    const { url } = await $fetch('/api/claim', {
      method: 'POST',
      body: {
        source: language.value,
        invitation: invitation.value,
        turnstile: form.value
          ? new FormData(form.value).get('cf-turnstile-response')?.toString()
          : undefined,
      },
    })
    await navigateTo(url, { external: true })
  } catch (e) {
    const code = (e as { data?: { data?: { code?: unknown } } }).data?.data
      ?.code
    error.value = isClaimError(code) ? code : 'failed'
    pending.value = false
    // A Turnstile response is good for one check.
    window.turnstile?.reset()
  }
}
</script>
