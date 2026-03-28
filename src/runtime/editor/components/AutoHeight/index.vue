<template>
  <div
    class="bk-auto-height"
    :class="'bk-is-' + anchor"
    :style="{ height: height + 'px' }"
  >
    <div ref="inner" class="bk-auto-height-inner">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef, ref, onMounted, onBeforeUnmount } from '#imports'

defineProps<{
  anchor: 'top' | 'bottom'
}>()

const inner = useTemplateRef('inner')
const height = ref(0)

let observer: ResizeObserver | null = null

onMounted(() => {
  const el = inner.value
  if (!el) return
  observer = new ResizeObserver(() => {
    height.value = el.scrollHeight
  })
  observer.observe(el)
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<style lang="postcss">
.bk .bk-auto-height {
  @apply relative overflow-hidden;
  transition: 0.3s height;
  @apply ease-swing;

  &.bk-is-top {
    .bk-auto-height-inner {
      @apply top-0;
    }
  }

  &.bk-is-bottom {
    .bk-auto-height-inner {
      @apply bottom-0;
    }
  }

  .bk-auto-height-inner {
    @apply absolute left-0 w-full;
  }
}
</style>
