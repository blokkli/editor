<template>
  <div
    class="inline-flex items-center rounded-full px-8 py-5 uppercase text-xs font-semibold tracking-wide leading-none"
    :class="[
      'bk-scheme-' + scheme,
      {
        'bg-scheme-light text-scheme-dark': variant === 'light',
        'bg-scheme-normal text-scheme-text': variant === 'normal',
        'bg-scheme-dark text-scheme-light': variant === 'dark',
      },
    ]"
  >
    <slot>
      {{ text }}
    </slot>
  </div>
</template>

<script setup lang="ts">
import type { ThemeColorName } from './../../../../global/types/theme'

withDefaults(
  defineProps<{
    text?: string | number
    scheme?: ThemeColorName
    variant?: 'light' | 'normal' | 'dark'
  }>(),
  {
    text: '',
    scheme: 'accent',
    variant: 'light',
  },
)
</script>
