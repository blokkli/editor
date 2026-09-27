<template>
  <nav :aria-label="$texts('language_switch.label', 'Language')">
    <ul class="flex gap-3 text-sm font-semibold">
      <li v-for="item in items" :key="item.language" :lang="item.language">
        <span v-if="item.isCurrent" aria-current="page" class="text-stone-900">
          {{ item.language.toUpperCase() }}
        </span>
        <a
          v-else-if="item.link"
          :href="item.link.url.path"
          :hreflang="item.language"
          :title="item.link.title"
          class="text-stone-600 hover:text-stone-900 hover:underline"
        >
          {{ item.language.toUpperCase() }}
        </a>
        <span v-else class="cursor-not-allowed text-stone-300">
          {{ item.language.toUpperCase() }}
        </span>
      </li>
    </ul>
  </nav>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import type { LanguageSwitchLinkFragment } from '#graphql-operations'
import { useLanguage } from '~/composables/useLanguage'
import { LANGUAGES } from '#shared/languages'

// Drupal only links the translations that exist and that the user may view. A
// page without a translation in the current language shows the source content
// (Drupal's fallback), so the current language comes from the path.
const props = defineProps<{
  links: LanguageSwitchLinkFragment[]
}>()

const language = useLanguage()

const items = computed(() =>
  LANGUAGES.map((langcode) => ({
    language: langcode,
    isCurrent: langcode === language.value,
    link: props.links.find((link) => link.language.id === langcode),
  })),
)
</script>
