<template>
  <div v-if="orphans.length" class="p-panel-gap">
    <InfoBox color="yellow" small>
      <p class="text-pretty mb-5">
        {{
          $t(
            'chartsOrphanOverridesIntro',
            'These overrides reference items not present in the current data:',
          )
        }}
      </p>
      <ul class="flex flex-col gap-3 mt-5">
        <li
          v-for="orphan in orphans"
          :key="`${orphan.scope}:${orphan.name}`"
          class="flex items-center justify-between gap-10 bg-white border border-mono-300 rounded px-8 py-3"
        >
          <span class="font-medium text-mono-800 truncate">
            <span class="text-mono-500 mr-5">{{ orphan.scopeLabel }}</span>
            {{ orphan.name }}
          </span>
          <button
            type="button"
            class="bk-button bk-scheme-mono bk-is-small bk-is-icon"
            :title="$t('chartsOrphanOverridesRemove', 'Remove override')"
            @click="$emit('remove', orphan)"
          >
            <Icon name="bk_mdi_close" />
          </button>
        </li>
      </ul>
    </InfoBox>
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { Icon, InfoBox } from '#blokkli/editor/components'

export type OrphanOverride = {
  scope: 'series' | 'category'
  scopeLabel: string
  name: string
}

const props = defineProps<{
  seriesOverrideNames: string[]
  categoryOverrideNames: string[]
  knownSeries: string[]
  knownCategories: string[]
}>()

defineEmits<{
  remove: [OrphanOverride]
}>()

const { $t } = useBlokkli()

const orphans = computed<OrphanOverride[]>(() => {
  const result: OrphanOverride[] = []
  const knownSeries = new Set(props.knownSeries)
  const knownCategories = new Set(props.knownCategories)
  const seriesLabel = $t('chartsTranslationsSeries', 'Series')
  const categoryLabel = $t('chartsOverrideScopeCategory', 'Category')
  for (const name of props.seriesOverrideNames) {
    if (!knownSeries.has(name)) {
      result.push({ scope: 'series', scopeLabel: seriesLabel, name })
    }
  }
  for (const name of props.categoryOverrideNames) {
    if (!knownCategories.has(name)) {
      result.push({ scope: 'category', scopeLabel: categoryLabel, name })
    }
  }
  return result
})
</script>
