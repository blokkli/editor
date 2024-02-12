<template>
  <div class="bg-accent-700 py-30 md:py-50">
    <div class="md:max-w-3xl md:mx-auto text-center">
      <p
        class="uppercase font-semibold border px-10 py-1 rounded-full inline-block text-xs mb-20 text-accent-100 bg-accent-300/40 border-accent-900"
      >
        Let's Go!
      </p>
      <h2 class="text-2xl lg:text-4xl font-extrabold text-white">
        Start creating impressive content now
      </h2>
      <p class="text-md lg:text-xl mt-5 lg:mt-20 text-accent-200">
        Give blökkli a try now!
      </p>

      <a
        class="button mt-30 bg-white text-accent-800"
        href="https://github.com/blokkli/editor"
        >Try it now</a
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineBlokkliFragment } from '#imports'

defineBlokkliFragment({
  name: 'cta',
  label: 'CTA',
  description: 'Provides a large CTA section.',
  editor: {
    previewWidth: 1200,
  },
})
</script>
