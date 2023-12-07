<template>
  <Teleport to="#bk-blokkli-item-actions-dropdown">
    <div>
      <h3>{{ title }}</h3>
      <slot></slot>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
defineProps<{
  title: string
}>()
</script>
