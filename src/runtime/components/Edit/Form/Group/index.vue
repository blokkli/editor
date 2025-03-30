<template>
  <div
    class="bk-form-group"
    :class="{
      'bk-is-horizontal': horizontal,
    }"
  >
    <h3 v-if="title" class="bk-form-group-title">
      <span>{{ title }}</span>
      <slot name="addon" />
    </h3>
    <div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  horizontal?: boolean
}>()
</script>
