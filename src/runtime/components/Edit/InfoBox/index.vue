<template>
  <div class="bk-info-box">
    <Icon name="info" />
    <div>
      <slot>
        <p v-html="text" />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/components'

defineProps<{
  text?: string
}>()
</script>
