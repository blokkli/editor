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

defineBlokkli({
  bundle: 'slider',
  propsFieldMapping: {
    slides: { type: 'field', name: 'slides' },
  },
  editor: {
    icon: 'bk_mdi_view_carousel',
    disableEdit: true,
  },
})

const isEditing = import.meta.blokkliEditing

if (import.meta.blokkliEditing) {
  console.log('DEBUG - SLIDER: EDITING')
} else {
  console.log('DEBUG - SLIDER: NOT EDITING')
}

export type Props = {
  slides: FieldListItemTypedArray
}

defineProps<Props>()
</script>

<style>
@reference "~/assets/css/tailwind.css";

.block-slider {
  @apply overflow-auto;
  > * {
    @apply w-full;
    flex: 0 0 100%;
  }
}
</style>
