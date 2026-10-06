<template>
  <section
    v-if="sandbox"
    id="sandbox"
    aria-labelledby="sandbox-title"
    class="flex max-w-content flex-col items-start gap-4"
  >
    <h2 id="sandbox-title" class="font-serif text-h2">
      {{ texts.sandboxTitle }}
    </h2>
    <p>{{ expiry }}</p>
    <button
      v-if="ownLogin"
      type="button"
      class="button is-secondary"
      @click="copy(ownLogin.url)"
    >
      {{ copied === ownLogin.url ? texts.copied : texts.copyLink }}
    </button>
    <template v-if="colleagues.length">
      <h3 class="mt-4 text-h3">{{ texts.inviteTitle }}</h3>
      <p>{{ texts.inviteText }}</p>
      <ul
        class="flex w-full flex-col divide-y divide-line border-y border-line"
      >
        <li
          v-for="login in colleagues"
          :key="login.url"
          class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
        >
          <span>
            <span class="font-semibold">{{ login.name }}</span>
            <span class="text-muted">, {{ login.role }}</span>
          </span>
          <button
            type="button"
            class="cursor-pointer font-semibold text-primary hover:underline"
            @click="copy(login.url)"
          >
            {{ copied === login.url ? texts.copied : texts.copy }}
          </button>
        </li>
      </ul>
    </template>
  </section>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { TEXTS } from '~/components/Welcome/texts'
import { useLanguage } from '~/composables/useLanguage'
import { useSandbox } from '~/composables/useSandbox'

// The welcome page's part about the sandbox, like the sandbox's popup: when
// it's deleted, the link to come back, and the colleagues' links. Only in
// sandboxes the control app made.
const language = useLanguage()
const texts = computed(() => TEXTS[language.value])
const { sandbox, expiresDate, idleHours, ownLogin, colleagues, copied, copy } =
  useSandbox()

const expiry = computed(() =>
  idleHours.value === null
    ? texts.value.expires.replace('@date', expiresDate.value)
    : texts.value.expiresIdle
        .replace('@date', expiresDate.value)
        .replace('@hours', String(idleHours.value)),
)
</script>
