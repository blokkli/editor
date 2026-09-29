<template>
  <nav :aria-label="$texts('language_switch.label', 'Language')">
    <ul class="flex text-small">
      <li v-for="item in items" :key="item.language" :lang="item.language">
        <span
          v-if="item.isCurrent"
          aria-current="page"
          class="block px-1.5 py-2 font-bold"
        >
          {{ item.language.toUpperCase() }}
        </span>
        <SiteLink
          v-else-if="item.link"
          :to="item.link.url.path"
          :hreflang="item.language"
          :title="item.link.title"
          class="block px-1.5 py-2 opacity-80 hover:underline hover:opacity-100"
        >
          {{ item.language.toUpperCase() }}
        </SiteLink>
        <span v-else class="block cursor-not-allowed px-1.5 py-2 opacity-40">
          {{ item.language.toUpperCase() }}
        </span>
      </li>
    </ul>
  </nav>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { SiteLink } from '#components'
import type { LanguageSwitchLinkFragment } from '#graphql-operations'
import { useLanguage } from '~/composables/useLanguage'
import { LANGUAGES } from '#shared/languages'

// The colour is inherited: the switch sits on light and dark grounds.
//
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
