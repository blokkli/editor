<template>
  <div
    class="bg-accent-700 text-white text-xs uppercase rounded-full font-semibold px-[7px] py-1"
    :class="{
      '!bg-white !text-accent-700': inverted,
    }"
  >
    BETA
  </div>
</template>

<script setup lang="ts">
defineProps<{
  inverted?: boolean
}>()
</script>
