<template>
  <Teleport v-if="isVisible" to="body">
    <slot />
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, useBlokkli } from '#imports'

const props = defineProps<{
  id: string
  title: string
}>()

const { debug } = useBlokkli()

const isVisible = computed(
  () =>
    debug.isEnabled.value &&
    debug.overlays.value.find((v) => v.id === props.id)?.active,
)

onMounted(() => {
  debug.registerOverlay(props.id, props.title)
})

onBeforeUnmount(() => {
  debug.unregisterOverlay(props.id)
})

defineOptions({
  name: 'DebugOverlay',
})
</script>
