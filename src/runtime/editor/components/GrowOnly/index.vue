<template>
  <div :style="minHeight ? { minHeight: `${minHeight}px` } : undefined">
    <div ref="inner">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef, ref, onMounted, onBeforeUnmount } from '#imports'

const inner = useTemplateRef('inner')
const minHeight = ref(0)

let observer: ResizeObserver | null = null

onMounted(() => {
  const el = inner.value
  if (!el) return
  observer = new ResizeObserver(() => {
    const h = el.scrollHeight
    if (h > minHeight.value) {
      minHeight.value = h
    }
  })
  observer.observe(el)
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<script lang="ts">
export default {
  name: 'GrowOnly',
}
</script>
