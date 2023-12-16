<template>
  <Teleport v-if="enabled" to="#bk-blokkli-item-actions-dropdown">
    <div>
      <h3>{{ title }}</h3>
      <slot />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'
const props = defineProps<{
  id: string
  title: string
  enabled: boolean
}>()

const { eventBus } = useBlokkli()

const isRendering = computed(() => props.enabled)

onMounted(() => {
  eventBus.emit('plugin:mount', {
    type: 'ItemDropdown',
    id: props.id,
    isRendering,
  })
})

onBeforeUnmount(() => {
  eventBus.emit('plugin:unmount', {
    type: 'ItemDropdown',
    id: props.id,
  })
})
</script>

<script lang="ts">
export default {
  name: 'PluginItemDropdown',
}
</script>
