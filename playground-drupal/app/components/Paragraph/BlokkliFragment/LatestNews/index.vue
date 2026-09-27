<template>
  <div
    :class="[
      options.display === 'list' ? 'container-content' : 'container-wide',
      { hidden: !items.length && !isEditing },
    ]"
  >
    <div
      v-if="items.length"
      :class="
        options.display === 'list'
          ? 'border-t border-ink'
          : 'grid gap-x-grid gap-y-10 md:grid-cols-3'
      "
    >
      <NodeTeaser
        v-for="item in items"
        :key="item.url?.path"
        :node="item"
        :display="options.display"
      />
    </div>
    <p v-else-if="isEditing" class="bg-surface p-4 text-muted">
      {{ $texts('latest_news.empty', 'No news.') }}
    </p>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineBlokkliFragment, useAsyncGraphqlQuery } from '#imports'
import type { NodeTeaserFragment } from '#graphql-operations'
import NodeTeaser from '~/components/NodeTeaser/index.vue'
import { useLanguage } from '~/composables/useLanguage'

// Before the await: the editor needs the definition during setup.
const { options } = defineBlokkliFragment({
  name: 'latest_news',
  label: 'Latest news',
  description: 'The three latest news items.',
  options: {
    display: {
      type: 'radios',
      label: { en: 'Display', de: 'Darstellung', fr: 'Affichage' },
      default: 'card',
      options: {
        card: { label: { en: 'Cards', de: 'Karten', fr: 'Cartes' } },
        list: { label: { en: 'List', de: 'Liste', fr: 'Liste' } },
      },
    },
  },
  editor: {
    icon: 'bk_mdi_news',
    previewWidth: 800,
  },
})

const language = useLanguage()

const { data } = await useAsyncGraphqlQuery(
  'latestNews',
  computed(() => ({ language: language.value })),
)

const items = computed(() =>
  (data.value?.data.news.items ?? []).filter(
    (v): v is NodeTeaserFragment => !!v && '__typename' in v,
  ),
)

const isEditing = import.meta.blokkliEditing
</script>
