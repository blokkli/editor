<template>
  <main class="min-h-screen border border-line p-4 md:p-6">
    <FeeCalculator />
  </main>
</template>

<script lang="ts" setup>
import { useEasyTexts, useHead } from '#imports'
import FeeCalculator from '~/components/FeeCalculator/index.vue'

// The fee calculator alone, without the site's header and footer: embedded in
// pages with the embed paragraph type. A box as high as the frame, like the
// contact box: its padding keeps focus outlines inside the frame.
const { $texts } = useEasyTexts()

useHead({
  title: () => $texts('fee_calculator.title', 'Fee calculator'),
  meta: [{ name: 'robots', content: 'noindex' }],
})
</script>
