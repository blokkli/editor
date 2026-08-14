<template>
  <div class="container mt-25">
    <div class="p-10 lg:p-20 rounded border border-mono-300 bg-white">
      <!--
        Deliberately NOT annotated with `v-blokkli-editable`. Both fields reach
        the component through `propsFieldMapping` alone, so neither has an
        element of its own — which is the case the approval highlight has to
        cope with by merging them into a single decision on the block.
      -->
      <h3 class="font-bold md:text-lg lg:text-xl lg:mb-5" v-text="title" />
      <p class="text-sm md:text-base" v-text="text" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'

defineBlokkli({
  bundle: 'card_plain',
  editor: {
    previewWidth: 380,
    addBehaviour: 'no-form',
    icon: 'bk_mdi_cards_stack',
    editTitle: (el) => el.querySelector('h3')?.textContent,
  },
  propsFieldMapping: {
    title: {
      type: 'editable',
      name: 'title',
    },
    text: {
      type: 'editable',
      name: 'text',
    },
  },
})

export type Props = {
  title: string
  text: string
}

defineProps<Props>()
</script>
