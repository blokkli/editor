<template>
  <div>
    <div
      class="p-10 lg:p-20 rounded shadow-lg border h-full bg-white border-mono-300"
    >
      <div
        class="rounded w-50 h-50 lg:w-[64px] lg:h-[64px] p-10 mb-10 border bg-yellow-light text-yellow-dark border-yellow-normal"
      >
        <SpriteSymbol name="fragment" class="fill-current w-full h-full" />
      </div>
      <h3
        v-blokkli-editable:title
        class="font-bold md:text-lg lg:text-xl lg:mb-5"
      >
        This is a fragment!
      </h3>
      <p v-blokkli-editable:text class="text-sm md:text-base">
        This is some dummy text.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineBlokkliFragment } from '#imports'

defineBlokkliFragment({
  name: 'demo_card',
  label: 'Demo Card',
  description: 'Renders a card.',
  editor: {
    previewWidth: 400,
  },
})
</script>
