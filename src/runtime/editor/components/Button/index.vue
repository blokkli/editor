<template>
  <button
    type="button"
    :disabled="disabled"
    :class="[
      'bk-button',
      'bk-scheme-' + scheme,
      {
        'bk-is-light': variant === 'light',
        'bk-is-dark': variant === 'dark' || variant === 'outline-dark',
        'bk-is-outline':
          variant === 'outline' || variant === 'outline-dark',
        'bk-is-small': size === 'small',
        'bk-is-icon-only': iconOnly,
        'bk-is-fullwidth': fullwidth,
        'bk-is-loading': loading,
      },
    ]"
  >
    <slot>
      {{ label }}
    </slot>
  </button>
</template>

<script setup lang="ts">
import type { ThemeColorName } from './../../../../global/types/theme'

withDefaults(
  defineProps<{
    label?: string
    scheme?: ThemeColorName
    variant?: 'normal' | 'light' | 'dark' | 'outline' | 'outline-dark'
    size?: 'normal' | 'small'
    iconOnly?: boolean
    fullwidth?: boolean
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    label: '',
    scheme: 'accent',
    variant: 'normal',
    size: 'normal',
  },
)
</script>
