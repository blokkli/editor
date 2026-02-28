<template>
  <div
    :class="{
      'w-full max-w-prose mx-auto my-20 lg:my-50': !parentType,
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
    text: { type: 'editable', name: 'text' },
  },
})

export type Props = {
  text: string
}

defineProps<Props>()

const injectedInverted = inject<ComputedRef<boolean> | null>('isInverted', null)
const isInverted = computed(() => !!injectedInverted?.value)
</script>

<style>
/*
 * Visual indicator for raw vs processed field values.
 *
 * Processed markup has `data-bk-processed` on block elements (added by
 * FieldTextarea.getText()). If these borders are missing, raw/unprocessed
 * text leaked into the display — a bug.
 */
.ck-content [data-bk-processed] {
  border-left: 3px solid #4ade80;
  padding-left: 8px;
}
</style>
