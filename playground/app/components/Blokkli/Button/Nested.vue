<template>
  <Component
    :is="isExternal ? 'a' : NuxtLink"
    v-bind="attributes"
    class="button shrink-0 grow-0 max-w-fit playground-button"
    v-blokkli-droppable:url
    :class="{
      'is-primary': options.color === 'primary',
      'is-inverted': options.color === 'normal' && isInverted,
    }"
  >
    <Icon v-if="icon" :name="icon" />
    <span v-blokkli-editable:title>{{ title || 'Learn more' }}</span>
  </Component>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed, inject, type ComputedRef } from '#imports'
import { NuxtLink } from '#components'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon } from '#blokkli/editor/components'

const { options } = defineBlokkli({
  bundle: 'button',
  renderFor: [
    {
      parentBundle: 'two_columns',
    },
    {
      parentBundle: 'grid',
    },
    {
      parentBundle: 'button_list',
    },
    {
      fieldListType: 'inline',
    },
  ],
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
  },
  editor: {
    addBehaviour: 'no-form',
    editTitle: (el) => el.querySelector('a')?.textContent,
  },
  propsFieldMapping: {
    url: null,
    title: {
      type: 'editable',
      name: 'title'
    },
    icon: null
  }
})

const props = defineProps<{
  url: string
  title?: string
  icon?: BlokkliIcon
}>()

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
