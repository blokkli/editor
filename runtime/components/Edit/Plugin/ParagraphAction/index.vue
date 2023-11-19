<template>
  <Teleport to="#pb-paragraph-actions">
    <button
      :disabled="disabled"
      @click="$emit('click')"
      :class="{ 'pb-is-active': active }"
    >
      <slot></slot>
      <div class="pb-tooltip">
        <span>{{ title }}</span>
        <ShortcutIndicator v-if="keyLabel" :meta="meta" :key-label="keyLabel" />
      </div>
    </button>
  </Teleport>
  <Teleport to="#pb-paragraph-actions-after">
    <slot name="after" :paragraphUuid="paragraphUuid"></slot>
  </Teleport>
</template>

<script lang="ts" setup>
import ShortcutIndicator from './../../ShortcutIndicator/index.vue'

const { selectedParagraph } = useParagraphsBuilderStore()

const paragraphUuid = computed(() => selectedParagraph?.value?.uuid)

defineProps<{
  title: string
  disabled?: boolean
  active?: boolean
  meta?: boolean
  keyLabel?: string
}>()

defineEmits(['click'])
</script>
