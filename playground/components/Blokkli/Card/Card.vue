<template>
  <div
    class="card-test"
    :class="{
      'container mx-auto mt-50 h-full': !parentType,
    }"
  >
    <div
      :class="{
        'p-10 lg:p-20 rounded shadow-lg border h-full': options.box,
        'bg-mono-700 border-mono-600': options.box && isInverted,
        'bg-white border-mono-300': options.box && !isInverted,
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
        v-blokkli-editable:title
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

type Props = {
  icon?: string
  title: string
  text: string
}

const { parentType, options } = defineBlokkli({
  bundle: 'card',

  options: {
    box: {
      type: 'checkbox',
      label: 'Box',
      default: true,
    },
    easyLanguageVisibility: {
      type: 'checkbox',
      label: 'Box',
      default: true,
    },
    color: {
      type: 'radios',
      label: 'Color',
      default: 'lightBlue',
      displayAs: 'colors',
      options: {
        lightBlue: { class: 'bg-accent-100', label: 'Blue' },
        lightYellow: { class: 'bg-yellow-normal', label: 'Yellow' },
        lightGreen: { class: 'bg-lime-normal', label: 'Green' },
        lightRed: { class: 'bg-red-normal', label: 'Red' },
      },
    },
  },
  editor: {
    previewWidth: 380,
    addBehaviour: 'no-form',
    editTitle: (el) => el.querySelector('h3')?.textContent,
    determineVisibleOptions: (ctx) => {
      if (ctx.entity.language === 'ls') {
        return ['easyLanguageVisibility']
      }
      if (ctx.props.icon) {
        return ['box', 'color']
      }
      return ['box']
    },
    getDraggableElement: (el) => el.querySelector('div'),
  },
})

defineProps<Props>()

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

<style lang="postcss">
@keyframes card-test {
  from {
    transform: scaleX(0.7);
  }
  to {
    transform: scaleX(1.2);
  }
}

.card-test {
  /* animation: 2s card-test infinite; */
}
</style>
