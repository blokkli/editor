<template>
  <div
    :id="'title-' + uuid"
    :class="{ 'container mx-auto mt-20 lg:mt-50 text-center': !parentType }"
  >
    <div :class="{ 'md:max-w-3xl md:mx-auto md:text-center': isCentered }">
      <p
        v-if="tagline"
        v-blokkli-editable:tagline
        class="uppercase font-semibold border px-10 py-1 rounded-full inline-block text-xs mb-20"
        :class="
          isInverted
            ? 'bg-mono-900 border-mono-500 text-mono-100'
            : 'text-teal-dark/80 bg-teal-light/40 border-teal-normal'
        "
      >
        {{ tagline }}
      </p>
      <h2
        v-blokkli-editable:title
        class="text-2xl lg:text-4xl font-extrabold"
        :class="{ 'text-white': isInverted }"
        v-text="title"
      />
      <p
        v-if="lead"
        v-blokkli-editable:lead
        class="text-md lg:text-xl mt-5 lg:mt-20"
        :class="isInverted ? 'text-mono-300' : 'text-mono-600'"
        v-text="lead"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed, inject, type ComputedRef } from '#imports'
const { parentType, fieldListType, uuid } = defineBlokkli({
  bundle: 'title',
  options: {
    showInMenu: {
      type: 'checkbox',
      label: 'Show in menu',
      default: true,
    },
  },
  editor: {
    addBehaviour: 'editable:title',
    previewWidth: 700,
    editTitle: (el) => el.querySelector('h2')?.textContent,
    getDraggableElement: (el) => el.firstElementChild,
  },
})

const injectedInverted = inject<ComputedRef<boolean> | null>('isInverted', null)
const isInverted = computed(() => !!injectedInverted?.value)

const props = defineProps<{
  title: string
  tagline?: string
  lead?: string
}>()

const isCentered = computed(
  () =>
    (props.lead || props.tagline) &&
    (fieldListType.value === 'header' || !parentType.value),
)
</script>
