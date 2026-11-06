<template>
  <div class="relative">
    <button
      class="bk-toolbar-button"
      data-test="language-switcher-toggle"
      :class="{ 'bk-is-active': isOpen }"
      @click.stop.prevent="isOpen = !isOpen"
    >
      <StatusIndicator
        v-if="showStatus && activeItem?.translation?.exists"
        :status="activeItem.translation.status ? 'success' : 'error'"
        class="mr-8"
      />
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
        :data-test="`language-switcher-option-${item.id}`"
        class="group/tooltip px-10 py-8 w-full text-left min-w-[120px] flex items-center"
        :class="{
          'bg-white! text-mono-900 font-bold': item.id === activeLanguage.id,
          'text-mono-100 font-medium hover:bg-mono-700':
            item.translation?.exists,
          'text-mono-500 hover:bg-mono-700': !item.translation?.exists,
        }"
        @click.stop.prevent="$emit('select', item)"
      >
        <StatusIndicator
          v-if="showStatus && item.translation?.exists"
          :status="item.translation.status ? 'success' : 'error'"
          class="mr-8"
          data-test="language-switcher-status"
          :data-test-status="
            item.translation.status ? 'published' : 'unpublished'
          "
        />
        <span>{{ item.label }}</span>
        <Tooltip v-show="!isOpen" :label="item.label" class="w-full" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TranslationStateItem } from '../types'
import { Tooltip, Icon, StatusIndicator } from '#blokkli/editor/components'
import type { Language } from '#blokkli/editor/types/state'
import { computed, ref } from '#imports'
import { onBlokkliEvent } from '#blokkli/editor/composables'

const props = defineProps<{
  items: TranslationStateItem[]
  activeLanguage: Language
  showStatus: boolean
}>()

const activeItem = computed(() =>
  props.items.find((item) => item.id === props.activeLanguage.id),
)

defineEmits<{
  (e: 'select', item: TranslationStateItem): void
}>()

const isOpen = ref(true)

onBlokkliEvent('window:clickAway', () => {
  isOpen.value = false
})
</script>
