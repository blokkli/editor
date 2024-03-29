<template>
  <div :class="isInline ? 'inline-block' : 'container text-center mt-25'">
    <Component
      :is="isExternal ? 'a' : NuxtLink"
      v-bind="attributes"
      class="button"
      :class="{
        'is-primary': options.color === 'primary',
        'is-inverted': options.color === 'normal' && isInverted,
      }"
    >
      <span v-blokkli-editable:title>{{ title }}</span>
    </Component>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed, inject, type ComputedRef } from '#imports'
import { NuxtLink } from '#components'

const { options, parentType, fieldListType } = defineBlokkli({
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
  },
  editor: {
    addBehaviour: 'no-form',
    editTitle: (el) => el.querySelector('a')?.innerText,
    getDraggableElement: (el) => el.querySelector('a'),
  },
})

const isInline = computed(
  () => parentType.value || fieldListType.value === 'inline',
)

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
