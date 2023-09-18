<template>
  <div class="pb-sidebar-inner" @wheel.stop="">
    <h3 class="pb-sidebar-title">{{ title }}</h3>
    <div class="pb-sidebar-content">
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  title: string
}>()
</script>
