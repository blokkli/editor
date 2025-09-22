<template>
  <div class="relative">
    <BlokkliField
      v-slot="{ items }"
      name="slides"
      :list="slides"
      proxy-mode
      drop-alignment="horizontal"
    >
      <BlokkliSliderView :items="items" :is-editing />
    </BlokkliField>
  </div>
</template>

<script lang="ts" setup>
import type { FieldListItemTypedArray } from '#blokkli-build/generated-types'
import { defineBlokkli } from '#imports'

const { isEditing } = defineBlokkli({
  bundle: 'slider',
  propsFieldMapping: {
    slides: 'slides',
  },
  editor: {
    disableEdit: true,
  },
})

export type Props = {
  slides: FieldListItemTypedArray
}

defineProps<Props>()
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
