<template>
  <div class="h-full flex px-10">
    <button
      v-for="item in items"
      :key="item.id"
      :data-test="`language-switcher-option-${item.id}`"
      class="group/tooltip h-full flex items-center justify-center group px-3 first:pl-0 last:pr-0"
      @click.stop.prevent="$emit('select', item)"
    >
      <span
        class="text-sm rounded px-3 flex items-center justify-center min-w-25 min-h-25 border border-transparent"
        :class="{
          'border-mono-600!':
            item.id === sourceLanguage && item.id !== activeLangcode,
          'bg-white! text-mono-900 font-bold border-white!':
            item.id === activeLangcode,
          'text-mono-100 font-medium group-hover:bg-mono-700':
            item.translation?.exists,
          'text-mono-500 group-hover:bg-mono-700': !item.translation?.exists,
        }"
        >{{ item.code }}</span
      >
      <Tooltip
        :label="item.label"
        :description="getTooltipDescription(item)"
        class="min-w-full"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { TranslationStateItem } from '../types'
import { Tooltip } from '#blokkli/editor/components'
import { computed, useBlokkli } from '#imports'

defineProps<{
  items: TranslationStateItem[]
  activeLangcode: string
}>()

defineEmits<{
  (e: 'select', item: TranslationStateItem): void
}>()

const { $t, state } = useBlokkli()

const sourceLanguage = computed<string | null>(
  () => state.translation.value.sourceLanguage ?? null,
)

function getTooltipDescription(item: TranslationStateItem): string {
  if (item.id === sourceLanguage.value) {
    return $t('sourceLanguage', 'Source language')
  } else if (item.translation?.exists) {
    return $t('translation', 'Translation')
  }

  return $t('addTranslation', 'Add translation')
}
</script>
