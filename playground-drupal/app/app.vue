<template>
  <div class="bk-main-canvas">
    <NuxtPage />
  </div>
</template>

<script lang="ts" setup>
import { useHead } from '#imports'
import { NuxtPage } from '#components'
import { useLanguage } from '~/composables/useLanguage'

useHead({ htmlAttrs: { lang: useLanguage() } })
</script>
