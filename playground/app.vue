<template>
  <div class="bk-main-canvas">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk
      ? `${titleChunk} - blokk.li`
      : 'blokk.li - Page Builder for Nuxt'
  },
})
</script>

<style lang="postcss">
.bk-grid-overlay {
  @apply fixed top-0 left-0 w-full z-[99999999] h-full pointer-events-none;
  .container {
    @apply grid grid-cols-12 gap-40 h-full;
    > div {
      @apply h-full  border-l-[0.75px] border-l-black/40 border-r-[0.75px] border-r-black/40;
    }
  }
}
</style>
