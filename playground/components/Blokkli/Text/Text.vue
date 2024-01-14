<template>
  <div :class="{ 'container mx-auto my-20': !parentType }">
    <div
      v-blokkli-editable:text="{ type: 'frame' }"
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
    previewWidth: 700,
    editTitle: (el) => el.innerText,
    addBehaviour: 'editable:text',
    getDraggableElement: (el) => el.querySelector('.ck-content'),
  },
})

defineProps<{
  text: string
}>()

const injectedInverted = inject<ComputedRef<boolean> | null>('isInverted', null)
const isInverted = computed(() => !!injectedInverted?.value)
</script>

<style lang="postcss"></style>
