<template>
  <div
    class="inline-flex items-center rounded-full px-5 py-3 uppercase text-[10px] font-semibold tracking-wide leading-none"
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
