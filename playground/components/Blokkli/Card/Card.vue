<template>
  <div
    :class="{
      'container mx-auto mt-50 h-full': !parentType,
    }"
  >
    <div
      :class="{
        'p-10 lg:p-20 rounded shadow-lg border h-full': isBox,
        'bg-mono-700 border-mono-600': isBox && isInverted,
        'bg-white border-mono-300': isBox && !isInverted,
      }"
    >
      <div
        v-if="icon"
        class="rounded w-50 h-50 lg:w-[64px] lg:h-[64px] p-10 mb-10 border border-accent-100"
        :class="iconClass"
      >
        <SpriteSymbol :name="icon" class="fill-current w-full h-full" />
      </div>
      <h3
        v-blokkli-editable:title="{
          required: true,
          label: 'A very long editable title',
        }"
        class="font-bold md:text-lg lg:text-xl lg:mb-5"
        :class="{ 'text-mono-100': isInverted }"
        v-text="title"
      />
      <p
        v-blokkli-editable:text
        class="text-sm md:text-base"
        :class="{ 'text-mono-400': isInverted }"
        v-text="text"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed, inject, type ComputedRef } from '#imports'

const { parentType, options } = defineBlokkli({
  bundle: 'card',

  options: {
    box: {
      type: 'checkbox',
      label: 'Box',
      default: '1',
    },
    color: {
      type: 'radios',
      label: 'Color',
      default: 'lightBlue',
      displayAs: 'colors',
      options: {
        lightBlue: 'bg-accent-100',
        lightYellow: 'bg-yellow-normal',
        lightGreen: 'bg-lime-normal',
        lightRed: 'bg-red-normal',
      },
    },
  },
  editor: {
    previewWidth: 380,
    addBehaviour: 'no-form',
    editTitle: (el) => el.querySelector('h3')?.innerText,
    determineVisibleOptions: (ctx) => {
      if (ctx.options.box === '1') {
        return ['box', 'color']
      }
      return ['box']
    },
    getDraggableElement: (el) => el.querySelector('div'),
  },
})

defineProps<{
  icon?: string
  title: string
  text: string
}>()

const isBox = computed(() => options.value.box === '1')

const injectedInverted = inject<ComputedRef<boolean> | null>('isInverted', null)
const isInverted = computed(() => !!injectedInverted?.value)

const iconClass = computed(() => {
  if (options.value.color === 'lightYellow') {
    return isInverted.value
      ? 'bg-yellow-normal text-yellow-dark border-yellow-normal/50'
      : 'bg-yellow-light text-yellow-dark border-yellow-normal'
  } else if (options.value.color === 'lightGreen') {
    return isInverted.value
      ? 'bg-lime-normal text-lime-dark border-lime-dark/50'
      : 'bg-lime-light text-lime-dark border-lime-normal'
  } else if (options.value.color === 'lightRed') {
    return isInverted.value
      ? 'bg-red-normal text-red-dark border-red-normal'
      : 'bg-red-light text-red-dark border-red-dark/50'
  }
  return isInverted.value
    ? 'bg-accent-700 text-white border-accent-800'
    : 'bg-accent-50 text-accent-950 border-accent-400'
})
</script>
