<template>
  <div ref="el">
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * A component to wrap viewport blocking elements.
 *
 * A viewport blocking element is one that is either draggable by the user to
 * any location or one that the app renders that blocks the usual viewport.
 *
 * These are registered in the UI provider, where other features can access
 * them to determine the ideal placement for other overlays.
 *
 * This is primarly used for the "actions" bar on selected blocks, which tries
 * to not collide the bar with any of the blocking rectangles.
 */
import useAnimationFrame from '#blokkli/helpers/composables/useAnimationFrame'
import {
  useBlokkli,
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
} from '#imports'

const props = defineProps<{
  id: string
}>()

const { ui } = useBlokkli()

const x = ref(0)
const y = ref(0)
const width = ref(0)
const height = ref(0)

const rect = computed(() => {
  return {
    x: x.value,
    y: y.value,
    width: width.value,
    height: height.value,
  }
})

const el = ref<HTMLDivElement | null>(null)

useAnimationFrame(() => {
  if (!el.value) {
    return
  }

  const rect = el.value.getBoundingClientRect()
  x.value = rect.x
  y.value = rect.y
  width.value = rect.width
  height.value = rect.height
})

watch(rect, (v) => {
  ui.setViewportBlockingRectangle(props.id, v)
})

onMounted(() => {
  ui.setViewportBlockingRectangle(props.id, rect.value)
})

onBeforeUnmount(() => {
  ui.setViewportBlockingRectangle(props.id)
})
</script>
