<template>
  <div role="note" class="flex gap-3.5 border-t-4 px-5 py-4" :class="style.box">
    <SpriteSymbol
      :name="style.icon"
      class="mt-0.5 size-6 shrink-0"
      :class="style.text"
    />
    <div class="flex flex-col gap-1">
      <p v-if="title" class="font-bold" :class="style.text">{{ title }}</p>
      <p v-else class="sr-only">{{ typeLabel }}</p>
      <div><slot /></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, useEasyTexts } from '#imports'
import { SpriteSymbol } from '#components'

const props = defineProps<{
  type: 'info' | 'success' | 'warning' | 'error'
  title?: string
}>()

const { $texts } = useEasyTexts()

const STYLES = {
  info: { box: 'border-info bg-info-light', text: 'text-info', icon: 'info' },
  success: {
    box: 'border-success bg-success-light',
    text: 'text-success',
    icon: 'check',
  },
  warning: {
    box: 'border-warning bg-warning-light',
    text: 'text-warning',
    icon: 'warning',
  },
  error: {
    box: 'border-error bg-error-light',
    text: 'text-error',
    icon: 'error',
  },
} as const

const style = computed(() => STYLES[props.type])

// Without a title, screen readers still hear what kind of note it is.
const typeLabel = computed(() => {
  switch (props.type) {
    case 'info':
      return $texts('callout.info', 'Information')
    case 'success':
      return $texts('callout.success', 'Success')
    case 'warning':
      return $texts('callout.warning', 'Warning')
    case 'error':
      return $texts('callout.error', 'Error')
  }
})
</script>
