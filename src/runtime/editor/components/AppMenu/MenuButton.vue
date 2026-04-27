<template>
  <button
    :id="'bk-menu-list-button-' + id"
    class="w-full text-left whitespace-nowrap text-mono-950 lg:hover:bg-mono-100 border-b border-b-mono-200 group"
    :disabled
    :class="[
      {
        'bk-scheme-lime': type === 'success',
        'bk-scheme-red': type === 'danger',
        'bk-scheme-yellow': type === 'yellow',
        'bk-scheme-mono': !type,
        'pointer-events-none': disabled,
      },
    ]"
    @click.prevent.stop="onClick"
  >
    <div
      class="grid pl-15 pr-20 gap-x-10 grid-cols-[auto_1fr]"
      :class="{
        'py-10': small,
        'py-15': !small,
        'opacity-30': disabled,
      }"
    >
      <div
        class="flex items-center justify-center border bg-scheme-light text-scheme-normal border-scheme-normal/50 group-hover:border-scheme-normal group-hover:text-scheme-dark"
        :class="{
          'size-[35px]': small,
          'size-50': !small,
        }"
      >
        <Icon v-if="icon" :name="icon" class="size-[60%]" />
      </div>
      <div
        class="flex flex-col justify-center"
        :class="{
          'gap-2': !small,
        }"
      >
        <strong
          class="font-semibold"
          :class="{
            'text-xs': small,
            'text-base': !small,
          }"
          >{{ title }}</strong
        >
        <span
          class="text-mono-500 group-hover:text-mono-700"
          :class="{
            'text-xs': small,
            'text-sm': !small,
          }"
          >{{ description }}</span
        >
      </div>
    </div>
  </button>
</template>

<script lang="ts" setup>
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon } from '#blokkli/editor/components'

defineProps<{
  id: string
  title: string
  description: string
  disabled?: boolean
  icon?: BlokkliIcon
  type?: 'success' | 'danger' | 'yellow'
  small?: boolean
}>()

const emit = defineEmits(['click'])

function onClick() {
  emit('click')
}
</script>

<script lang="ts">
export default {
  name: 'MenuButton',
}
</script>
