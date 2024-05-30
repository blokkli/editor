<template>
  <Component
    :is="isExternal ? 'a' : NuxtLink"
    v-bind="attributes"
    class="button shrink-0 grow-0 max-w-fit"
    :class="{
      'is-primary': options.color === 'primary',
      'is-inverted': options.color === 'normal' && isInverted,
    }"
  >
    <span v-blokkli-editable:title>{{ title }}</span>
  </Component>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed, inject, type ComputedRef } from '#imports'
import { NuxtLink } from '#components'

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
      fieldList: 'inline',
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
    align: {
      type: 'radios',
      label: 'Align',
      default: 'center',
      options: {
        top: 'Top',
        center: 'Center',
        bottom: 'Bottom',
      },
    },
  },
  editor: {
    addBehaviour: 'no-form',
    editTitle: (el) => el.querySelector('a')?.textContent,
    getDraggableElement: (el) => el.querySelector('a'),
  },
})

const props = defineProps<{
  url: string
  title: string
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
