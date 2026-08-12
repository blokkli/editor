<template>
  <!-- A random comment. -->
  <div
    :class="{
      'w-full max-w-prose mx-auto my-20 lg:my-50': !hasParentType,
      'mt-50 mb-10': hasParentType,
    }"
  >
    <div
      ref="blokkliDraggable"
      v-blokkli-editable:text
      class="ck-content"
      :class="{ 'is-inverted': isInverted }"
      v-html="text"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  text: string
  hasParentType: boolean
  isInverted?: boolean
}>()
</script>
