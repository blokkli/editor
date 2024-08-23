<template>
  <div :style="style">
    <div v-html="messages.join(', ')" />
  </div>
</template>

<script setup lang="ts">
import { useBlokkli, ref, computed } from '#imports'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type { Rectangle } from '#blokkli/types'

const { dom } = useBlokkli()

const props = defineProps<{
  uuid: string
  messages: string[]
}>()

const rect = ref<Rectangle | null>(null)

const style = computed(() => {
  if (!rect.value) {
    return
  }

  return {
    transform: `translate(${rect.value.x}px, ${rect.value.y}px)`,
    width: rect.value.width + 'px',
    height: rect.value.height + 'px',
  }
})

onBlokkliEvent('canvas:draw', () => {
  const newRect = dom.getBlockRect(props.uuid)
  if (!newRect) {
    return
  }

  if (
    newRect.width === rect.value?.width &&
    newRect.height === rect.value.height &&
    newRect.x === rect.value.x &&
    newRect.y === rect.value.y
  ) {
    return
  }

  rect.value = newRect
})
</script>
