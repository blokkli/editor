<template>
  <div
    ref="el"
    class="bk bk-banner"
    :class="scheme ? 'bk-scheme-' + scheme : undefined"
  >
    <Icon :name="icon" />
    <p v-html="text" />
    <button v-if="button" class="bk-banner-close" @click="$emit('click')">
      {{ button }}
      <Icon name="bk_mdi_close" />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon } from '#blokkli/editor/components'
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
    icon: BlokkliIcon
    text: string
    button?: string
    scheme?: ThemeColorName
  }>(),
  {
    button: undefined,
    scheme: 'accent',
  },
)

defineEmits<{
  (e: 'click'): void
}>()

const { ui } = useBlokkli()

const el = useTemplateRef('el')

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
</script>
