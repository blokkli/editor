<template>
  <div class="bk-main-canvas">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script lang="ts" setup>
import { useHead } from '#imports'
import { NuxtLayout, NuxtPage } from '#components'
import { useLanguage } from '~/composables/useLanguage'

useHead({ htmlAttrs: { lang: useLanguage() } })
</script>
