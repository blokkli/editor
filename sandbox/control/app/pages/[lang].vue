<template>
  <div class="min-h-screen">
    <header class="border-b border-line bg-white">
      <div class="container-wide flex items-center gap-3 py-3 lg:py-4">
        <div class="mr-auto flex items-center gap-3">
          <Logo class="h-11 w-auto shrink-0 lg:h-12" />
          <span class="flex flex-col">
            <span class="font-serif text-body font-semibold lg:text-h3">
              {{ texts.site }}
            </span>
            <span class="text-small text-muted">blökkli sandbox</span>
          </span>
        </div>
        <nav class="flex gap-1 text-small" :aria-label="texts.languages">
          <a
            v-for="code in LANGUAGES"
            :key="code"
            :href="`/${code}${invitationQuery}`"
            :lang="code"
            :aria-current="code === language ? 'page' : undefined"
            class="px-1.5 py-1 font-semibold text-muted uppercase hover:underline aria-[current=page]:text-ink"
          >
            {{ code }}
          </a>
        </nav>
      </div>
    </header>

    <main class="container-wide py-section">
      <div class="flex max-w-content flex-col gap-6">
        <h1 class="font-serif text-h1">{{ texts.title }}</h1>
        <p class="text-lead">{{ texts.intro }}</p>
        <p
          v-if="invitation"
          class="border-l-4 border-primary bg-primary-light px-4 py-3"
        >
          {{ texts.premium }}
        </p>
        <p v-else>{{ texts.lifetime }}</p>

        <form
          ref="form"
          class="mt-4 flex flex-col items-start gap-6"
          @submit.prevent="submit"
        >
          <fieldset class="flex flex-col gap-3">
            <legend class="mb-1 text-h3">{{ texts.sourceLegend }}</legend>
            <p class="text-small text-muted">{{ texts.sourceDescription }}</p>
            <label
              v-for="code in LANGUAGES"
              :key="code"
              class="flex items-center gap-3 has-disabled:opacity-50"
            >
              <input
                v-model="source"
                type="radio"
                name="source"
                :value="code"
                :disabled="!sources.includes(code)"
                class="size-5 accent-primary"
              />
              <span :lang="code">{{ LANGUAGE_NAMES[code] }}</span>
            </label>
          </fieldset>

          <div
            v-if="hasTurnstile"
            class="cf-turnstile"
            :data-sitekey="turnstileSiteKey"
            :data-language="language"
          />

          <button type="submit" class="button" :disabled="pending">
            {{ pending ? texts.pending : texts.submit }}
          </button>
          <p v-if="error" role="alert" class="text-error">
            {{ texts.errors[error] }}
          </p>
        </form>
      </div>
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
} from '../../../frontend/shared/languages'
import {
  DEFAULT_LANGUAGE,
  isClaimError,
  type ClaimError,
} from '../../shared/claim'
import { TEXTS } from '../texts'

// The claim page, in each language: /de, /fr, /en (server/middleware/language.ts
// redirects / here). With ?invitation=…, it creates a premium sandbox.
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

const { data: sources } = await useFetch('/api/templates', {
  default: (): Language[] => [],
})
const source = ref<Language | undefined>(
  sources.value.includes(DEFAULT_LANGUAGE)
    ? DEFAULT_LANGUAGE
    : sources.value[0],
)

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
        source: source.value,
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
