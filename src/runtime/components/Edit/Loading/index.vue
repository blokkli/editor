<template>
  <Teleport to="body">
    <div class="bk bk-init-overlay">
      <Icon name="spinner" />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { Icon } from '#blokkli/components'
</script>

<script lang="ts">
export default {
  name: 'Loading',
}
</script>
