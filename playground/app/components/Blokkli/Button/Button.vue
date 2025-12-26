<template>
  <div v-if="options.align === 'left'" class="container mt-25 text-left">
    <Component
      :is="isExternal ? 'a' : NuxtLink"
      v-bind="attributes"
      class="button playground-button"
      :class="{
        'is-primary': options.color === 'primary',
        'is-inverted': options.color === 'normal' && isInverted,
      }"
    >
      <Icon v-if="icon" :name="icon" />
      <span v-blokkli-editable:title>{{ title }}</span>
    </Component>
  </div>
  <div
    v-else
    class="container mt-25"
    :class="{
      'text-center': options.align === 'center',
      'text-right': options.align === 'right',
    }"
  >
    <Component
      :is="isExternal ? 'a' : NuxtLink"
      v-bind="attributes"
      ref="blokkliDraggable"
      class="button playground-button"
      :class="{
        'is-primary': options.color === 'primary',
        'is-inverted': options.color === 'normal' && isInverted,
      }"
    >
      <Icon v-if="icon" :name="icon" />
      <span v-blokkli-editable:title>{{ title }}</span>
    </Component>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed, inject, type ComputedRef } from '#imports'
import { NuxtLink } from '#components'
import { Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'

const { options } = defineBlokkli({
  bundle: 'button',
  options: {
    color: {
      type: 'radios',
      label: 'Color',
      default: 'normal',
      displayAs: 'colors',
      options: {
        normal: { class: 'bg-white', label: 'White' },
        primary: { class: 'bg-accent-700', label: 'Primary' },
      },
    },
    align: {
      type: 'radios',
      label: 'Align',
      default: 'center',
      options: {
        left: 'Left',
        center: 'Center',
        right: 'Right',
      },
    },
  },
  editor: {
    addBehaviour: 'no-form',
    icon: 'bk_mdi_buttons_alt',
    editTitle: (el) => el.querySelector('a')?.textContent,
  },
})

export type Props = {
  url: string
  title: string
  icon?: BlokkliIcon
}

const props = defineProps<Props>()

const injectedInverted = inject<ComputedRef<boolean> | null>('isInverted', null)
const isInverted = computed(() => !!injectedInverted?.value)

const href = computed(() => props.url)

const isExternal = computed(() => href.value.startsWith('http'))

const attributes = computed(() => {
  if (isExternal.value) {
    return {
      href: href.value,
    }
  }

  return {
    to: href.value,
  }
})
</script>

<style lang="postcss">
.playground-button {
  @apply inline-flex gap-10 items-center;

  &:has(.bk-icon) {
    @apply pl-10;
    .bk-icon {
      @apply size-40 bg-accent-100 rounded-full text-accent-700 p-10 -my-10;

      svg {
        @apply fill-current;
      }
    }

    &.is-primary {
      .bk-icon {
        @apply bg-accent-500 text-white;
      }
    }
  }
}
</style>
