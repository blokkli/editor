<template>
  <component
    :is="tag"
    class="inline-flex items-center rounded-full px-5 py-3 uppercase text-[10px] font-semibold tracking-wide leading-none"
    :class="[
      'bk-scheme-' + scheme,
      {
        'bg-scheme-light text-scheme-dark': variant === 'light',
        'bg-scheme-normal text-scheme-text': variant === 'normal',
        'bg-scheme-dark text-scheme-light': variant === 'dark',
        'hover:bg-scheme-light-hover': isInteractive && variant === 'light',
        'hover:bg-scheme-normal-hover': isInteractive && variant === 'normal',
        'hover:bg-scheme-dark-hover': isInteractive && variant === 'dark',
      },
    ]"
  >
    <Icon v-if="icon" :name="icon" class="size-10 mr-2" />
    <slot>
      {{ text }}
    </slot>
  </component>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import Icon from '../Icon/index.vue'
import type { BlokkliIcon } from '#blokkli-build/icons'
import type { ThemeColorName } from './../../../../global/types/theme'

const props = withDefaults(
  defineProps<{
    text?: string | number
    icon?: BlokkliIcon
    scheme?: ThemeColorName
    variant?: 'light' | 'normal' | 'dark'
    tag?: string
  }>(),
  {
    text: '',
    icon: undefined,
    scheme: 'accent',
    variant: 'light',
    tag: 'div',
  },
)

const isInteractive = computed<boolean>(
  () => props.tag === 'button' || props.tag === 'a',
)
</script>
