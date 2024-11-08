<template>
  <div class="relative">
    <BlokkliField
      v-slot="{ items }"
      name="slides"
      :list="slides"
      proxy-mode
      drop-alignment="horizontal"
    >
      <BlokkliSliderView :items="items" />
    </BlokkliField>
  </div>
</template>

<script lang="ts" setup>
import type { FieldListItemTypedArray } from '#blokkli/generated-types'
import { defineBlokkli } from '#imports'

defineBlokkli({
  bundle: 'slider',
  editor: {
    disableEdit: true,
  },
})

defineProps<{
  slides: FieldListItemTypedArray
}>()
</script>

<style lang="postcss">
.block-slider {
  @apply overflow-auto;
  > * {
    @apply w-full;
    flex: 0 0 100%;
  }
}
</style>
