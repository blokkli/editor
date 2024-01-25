<template>
  <div :class="parentType ? 'inline-block' : 'container text-center mt-25'">
    <Component
      :is="isExternal ? 'a' : NuxtLink"
      v-bind="attributes"
      class="button"
      :class="{ 'is-primary': options.color === 'primary' }"
    >
      <span v-blokkli-editable:title="{ label: 'CTA' }">{{ title }}</span>
    </Component>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed } from '#imports'
import { NuxtLink } from '#components'

const { options, parentType } = defineBlokkli({
  bundle: 'button',
  options: {
    color: {
      type: 'radios',
      label: 'Color',
      default: 'white',
      displayAs: 'colors',
      options: {
        normal: 'bg-white',
        primary: 'bg-accent-700',
      },
    },
  },
  editor: {
    addBehaviour: 'no-form',
    editTitle: (el) => el.querySelector('a')?.innerText,
    getDraggableElement: (el) => el.querySelector('a'),
  },
})

const props = defineProps<{
  url: string
  title: string
}>()

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
