<template>
  <div :class="parentType ? 'inline-block' : 'container text-center mt-25'">
    <NuxtLink
      :to="href"
      class="button"
      :class="{ 'is-primary': options.color === 'primary' }"
    >
      <span v-blokkli-editable:title="{ label: 'CTA' }">{{ title }}</span>
    </NuxtLink>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed } from '#imports'

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
</script>
