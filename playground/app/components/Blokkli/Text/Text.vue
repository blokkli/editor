<template>
  <div
    :class="{
      'container mx-auto my-20': !parentType,
      'mt-50 mb-10': parentType,
    }"
  >
    <div
      ref="blokkliDraggable"
      v-blokkli-editable:text
      class="ck-content"
      :class="{ 'is-inverted': isInverted }"
      v-html="text"
    />
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed, inject, type ComputedRef } from '#imports'

const { parentType } = defineBlokkli({
  bundle: 'text',
  editor: {
    icon: 'bk_mdi_text_fields',
    previewWidth: 700,
    editTitle: (el) => el.textContent,
    addBehaviour: 'editable:text',
  },
  propsFieldMapping: {
    text: 'text',
  },
})

export type Props = {
  text: string
}

defineProps<Props>()

const injectedInverted = inject<ComputedRef<boolean> | null>('isInverted', null)
const isInverted = computed(() => !!injectedInverted?.value)
</script>
