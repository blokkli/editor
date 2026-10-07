<template>
  <div class="bk-main-canvas">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script lang="ts" setup>
useHead({ htmlAttrs: { lang: useLanguage() } })
</script>
