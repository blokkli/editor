<template>
  <div
    v-if="sandbox"
    v-click-away="onClickAway"
    class="relative font-[family-name:ui-sans-serif,system-ui,sans-serif]"
  >
    <button
      type="button"
      class="flex h-[43px] cursor-pointer items-center gap-2 rounded-full px-4 text-small font-bold hover:bg-[#d9e0f9] hover:text-[#043cad]"
      :class="{ 'bg-[#d9e0f9] text-[#043cad]': isOpen }"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <SpriteSymbol name="clock" class="size-5" aria-hidden="true" />
      {{ $texts('sandbox.label', 'Sandbox') }}
    </button>
    <div
      v-if="isOpen"
      class="absolute top-full right-0 z-10 mt-2 flex w-96 flex-col gap-4 rounded-[8px] bg-white p-5 text-small shadow-[0_8px_14px_rgba(0,0,0,.15)]"
    >
      <div class="flex items-start gap-3">
        <p class="grow">{{ expiry }}</p>
        <button
          type="button"
          class="-m-1 shrink-0 cursor-pointer p-1 hover:text-[#043cad]"
          :aria-label="$texts('sandbox.close', 'Close')"
          @click="isOpen = false"
        >
          <SpriteSymbol name="close" class="size-4" aria-hidden="true" />
        </button>
      </div>
      <NuxtLink
        :to="WELCOME_PATHS[language]"
        class="self-start font-bold text-[#043cad] hover:underline"
      >
        {{ $texts('sandbox.welcome', 'Things to try') }}
      </NuxtLink>
      <button
        v-if="ownLogin"
        type="button"
        class="cursor-pointer self-start font-bold text-[#043cad] hover:underline"
        @click="copy(ownLogin.url)"
      >
        {{
          copied === ownLogin.url
            ? $texts('sandbox.copied', 'Copied')
            : $texts('sandbox.copy_link', 'Copy the link to this sandbox')
        }}
      </button>
      <div v-if="colleagues.length" class="border-t border-[#eee] pt-4">
        <p class="font-bold">
          {{ $texts('sandbox.invite', 'Invite a colleague') }}
        </p>
        <p class="mt-1 text-muted">
          {{
            $texts(
              'sandbox.invite_text',
              'Each link logs your colleague in as that user, until the sandbox is deleted.',
            )
          }}
        </p>
        <ul class="mt-2 flex flex-col gap-1">
          <li
            v-for="login in colleagues"
            :key="login.url"
            class="flex items-baseline justify-between gap-3"
          >
            <span>
              {{ login.name }}
              <span class="text-muted">{{ login.role }}</span>
            </span>
            <button
              type="button"
              class="shrink-0 cursor-pointer font-bold text-[#043cad] hover:underline"
              @click="copy(login.url)"
            >
              {{
                copied === login.url
                  ? $texts('sandbox.copied', 'Copied')
                  : $texts('sandbox.copy', 'Copy the link')
              }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useEasyTexts } from '#imports'
import { NuxtLink, SpriteSymbol } from '#components'
import { WELCOME_PATHS } from '#shared/welcome'
import { useLanguage } from '~/composables/useLanguage'
import { useSandbox } from '~/composables/useSandbox'

// The sandbox's button next to the local tasks, in Drupal's admin style (Gin),
// with a popup: when the sandbox is deleted, the welcome page, and links that
// log its users in, to come back later and for colleagues. Drupal only has a
// sandbox for logged-in users of a sandbox the control app made, so there's no
// button on the dev site and in sandboxes made with drush.
const { $texts } = useEasyTexts()
const language = useLanguage()
const { sandbox, expiresDate, idleHours, ownLogin, colleagues, copied, copy } =
  useSandbox()

const isOpen = ref(false)

// A click outside closes the popup, like the × (plugins/clickAway.ts).
function onClickAway() {
  isOpen.value = false
}

const expiry = computed(() =>
  idleHours.value === null
    ? $texts('sandbox.expires', 'Your sandbox is deleted on @date.').replace(
        '@date',
        expiresDate.value,
      )
    : $texts(
        'sandbox.expires_idle',
        'Your sandbox is deleted on @date, or after @hours hours without use.',
      )
        .replace('@date', expiresDate.value)
        .replace('@hours', String(idleHours.value)),
)
</script>
