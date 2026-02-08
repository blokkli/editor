<template>
  <div class="bk-status-icon" :class="`bk-is-${status}`">
    <Icon v-if="icon" :name="icon" />
    <span v-else class="bk-status-icon-bullet" />
  </div>
</template>

<script lang="ts" setup>
import type { BlokkliIcon } from '#blokkli-build/icons'
import { computed } from '#imports'
import Icon from '../Icon/index.vue'

const props = defineProps<{
  status: 'pending' | 'active' | 'success' | 'error'
}>()

const icon = computed<BlokkliIcon | null>(() => {
  if (props.status === 'active') {
    return 'loader'
  } else if (props.status === 'success') {
    return 'bk_mdi_check'
  } else if (props.status === 'error') {
    return 'bk_mdi_priority_high'
  }
  return null
})
</script>

<script lang="ts">
export default {
  name: 'StatusIcon',
}
</script>
