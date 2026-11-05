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
        class="relative text-sm rounded px-3 flex items-center justify-center min-w-25 min-h-25 border border-transparent"
        :class="{
          'border-mono-600!':
            item.id === sourceLanguage && item.id !== activeLangcode,
          'bg-white! text-mono-900 font-bold border-white!':
            item.id === activeLangcode,
          'text-mono-100 font-medium group-hover:bg-mono-700':
            item.translation?.exists,
          'text-mono-500 group-hover:bg-mono-700': !item.translation?.exists,
        }"
        >{{ item.code }}
        <span
          v-if="showStatus && item.translation?.exists"
          class="absolute -top-5 -right-5 flex text-[8px] rounded-full border-2 border-mono-900"
          data-test="language-switcher-status"
          :data-test-status="
            item.translation.status ? 'published' : 'unpublished'
          "
        >
          <StatusIndicator
            :status="item.translation.status ? 'success' : 'error'"
          />
        </span>
      </span>
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
import { StatusIndicator, Tooltip } from '#blokkli/editor/components'
import { computed, useBlokkli } from '#imports'

const props = defineProps<{
  items: TranslationStateItem[]
  activeLangcode: string
  showStatus: boolean
}>()

defineEmits<{
  (e: 'select', item: TranslationStateItem): void
}>()

const { $t, state } = useBlokkli()

const sourceLanguage = computed<string | null>(
  () => state.translation.value.sourceLanguage ?? null,
)

function getTooltipDescription(item: TranslationStateItem): string {
  if (!item.translation?.exists) {
    return $t('addTranslation', 'Add translation')
  }

  const description =
    item.id === sourceLanguage.value
      ? $t('sourceLanguage', 'Source language')
      : $t('translation', 'Translation')

  if (!props.showStatus) {
    return description
  }

  const status = item.translation.status
    ? $t('languageSwitcherPublished', 'Published')
    : $t('languageSwitcherNotPublished', 'Not published')

  return `${description} · ${status}`
}
</script>
