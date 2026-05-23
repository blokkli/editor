<template>
  <div class="relative">
    <button
      class="bk-toolbar-button"
      :class="{ 'bk-is-active': isOpen }"
      @click.stop.prevent="isOpen = !isOpen"
    >
      <span>{{ activeLanguage.name }}</span>
      <Icon
        name="bk_mdi_arrow_drop_down"
        :class="{
          'rotate-180': isOpen,
        }"
      />
    </button>

    <div v-if="isOpen" class="absolute top-full left-0 bg-mono-900 shadow">
      <button
        v-for="item in items"
        :key="item.id"
        class="group/tooltip px-10 py-8 w-full text-left min-w-[120px]"
        :class="{
          'bg-white! text-mono-900 font-bold': item.id === activeLanguage.id,
          'text-mono-100 font-medium hover:bg-mono-700':
            item.translation?.exists,
          'text-mono-500 hover:bg-mono-700': !item.translation?.exists,
        }"
        @click.stop.prevent="$emit('select', item)"
      >
        <span>{{ item.label }}</span>
        <Tooltip v-show="!isOpen" :label="item.label" class="w-full" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TranslationStateItem } from '../types'
import { Tooltip, Icon } from '#blokkli/editor/components'
import type { Language } from '#blokkli/editor/types/state'
import { ref } from '#imports'
import { onBlokkliEvent } from '#blokkli/editor/composables'

defineProps<{
  items: TranslationStateItem[]
  activeLanguage: Language
}>()

defineEmits<{
  (e: 'select', item: TranslationStateItem): void
}>()

const isOpen = ref(true)

onBlokkliEvent('window:clickAway', () => {
  isOpen.value = false
})
</script>
