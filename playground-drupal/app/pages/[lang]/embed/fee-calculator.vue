<template>
  <main class="min-h-screen border border-line p-4 md:p-6">
    <FeeCalculator />
  </main>
</template>

<script lang="ts" setup>
import { createError, useEasyTexts, useHead, useRoute } from '#imports'
import FeeCalculator from '~/components/FeeCalculator/index.vue'
import { isLanguage } from '#shared/languages'

// The fee calculator alone, without the site's header and footer: embedded in
// pages with the embed paragraph type. A box as high as the frame, like the
// contact box: its padding keeps focus outlines inside the frame.
const route = useRoute()

if (!isLanguage(route.params.lang)) {
  throw createError({ statusCode: 404, fatal: true })
}

const { $texts } = useEasyTexts()

useHead({
  title: () => $texts('fee_calculator.title', 'Fee calculator'),
  meta: [{ name: 'robots', content: 'noindex' }],
})
</script>
