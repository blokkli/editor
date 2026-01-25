<template>
  <div ref="rootEl" class="bk bk-add-list-help" :style>
    <div class="bk-add-list-help-inner">
      <h2>{{ title }}</h2>
      <div v-if="text" v-html="text" class="bk-add-list-help-description" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  useBlokkli,
} from '#imports'
import type { AddListHelp } from '../types'

const props = defineProps<AddListHelp>()

const rootEl = useTemplateRef('rootEl')

const height = ref(200)

const { ui } = useBlokkli()

const rect = computed(() => {
  return props.element.getBoundingClientRect()
})

const style = computed<Record<string, string>>(() => {
  const x = rect.value.x + rect.value.width
  const y = Math.min(
    rect.value.y - 50,
    ui.visibleViewport.value.height - height.value - 10,
  )
  return {
    transform: `translate(${x}px, ${y}px)`,
  }
})

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) {
      return
    }
    height.value = entry.contentRect.height
  })
  if (rootEl.value) {
    resizeObserver.observe(rootEl.value)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>
