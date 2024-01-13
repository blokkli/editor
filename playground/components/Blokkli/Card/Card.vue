<template>
  <div
    :class="{
      'container mx-auto mt-50 h-full': !parentType,
    }"
  >
    <div
      :class="{
        'p-10 lg:p-20 rounded shadow-lg border h-full': isBox,
        'bg-slate-700 border-slate-600': isBox && isInverted,
        'bg-white border-slate-300': isBox && !isInverted,
      }"
    >
      <div
        v-if="icon"
        class="rounded w-50 h-50 lg:w-[64px] lg:h-[64px] p-10 mb-10 border border-blue-100"
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
        :class="{ 'text-slate-100': isInverted }"
        v-text="title"
      />
      <p
        v-blokkli-editable:text
        class="text-sm md:text-base"
        :class="{ 'text-slate-400': isInverted }"
        v-text="text"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed, inject, type ComputedRef } from '#imports'

const { parentType, options } = defineBlokkli({
  bundle: 'card',
  editWidth: 380,
  noAddForm: true,
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
        lightBlue: 'bg-blue-100',
        lightYellow: 'bg-yellow-200',
        lightGreen: 'bg-green-200',
        lightRed: 'bg-red-200',
      },
    },
  },
  editTitle: (el) => el.querySelector('h3')?.innerText,
  determineVisibleOptions: (ctx) => {
    if (ctx.options.box === '1') {
      return ['box', 'color']
    }
    return ['box']
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
      ? 'bg-yellow-500 text-black border-yellow-600'
      : 'bg-yellow-100 text-yellow-900 border-yellow-200'
  } else if (options.value.color === 'lightGreen') {
    return isInverted.value
      ? 'bg-green-500 text-green-950 border-green-600'
      : 'bg-green-100 text-green-900 border-green-200'
  } else if (options.value.color === 'lightRed') {
    return isInverted.value
      ? 'bg-red-500 text-black border-red-700'
      : 'bg-red-100 text-red-800 border-red-200'
  }
  return isInverted.value
    ? 'bg-blue-700 text-white border-blue-800'
    : 'bg-blue-50 text-blue-950'
})
</script>
