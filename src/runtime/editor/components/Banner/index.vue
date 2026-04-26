<template>
  <div
    ref="el"
    class="bk bk-banner text-scheme-text bg-scheme-normal text-xs md:text-base order-10 shadow-xl-inverted border-t border-scheme-dark/40 lg:min-h-50"
    :class="scheme ? 'bk-scheme-' + scheme : undefined"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import type { ThemeColorName } from './../../../../global/types/theme'
import {
  onBeforeUnmount,
  onMounted,
  useTemplateRef,
  useBlokkli,
} from '#imports'

const props = withDefaults(
  defineProps<{
    id: string
    scheme?: ThemeColorName
    standalone?: boolean
  }>(),
  {
    scheme: 'accent',
  },
)

const { ui } = useBlokkli()

const el = useTemplateRef('el')

if (!props.standalone) {
  const observer = new ResizeObserver((entries) => {
    const entry = entries.at(0)
    if (!entry) {
      return
    }
    const height = Math.ceil(entry.borderBoxSize.at(0)?.blockSize ?? 0)
    ui.setBannerHeight(props.id, height)
  })

  onMounted(() => {
    if (el.value) {
      observer.observe(el.value)
    }
  })

  onBeforeUnmount(() => {
    observer.disconnect()
    ui.removeBanner(props.id)
  })
}
</script>
