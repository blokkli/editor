<template>
  <div
    :id
    :class="{
      'container mx-auto mt-20 lg:mt-50 text-center': !parentType,
      'mt-50': parentType === 'two_columns' && fieldListType === 'inline',
    }"
  >
    <div
      ref="blokkliDraggable"
      :class="{ 'md:max-w-3xl md:mx-auto md:text-center': isCentered }"
    >
      <p
        v-if="renderedTagline"
        v-blokkli-editable:tagline
        class="uppercase font-semibold border px-10 py-1 rounded-full inline-block text-xs mb-20"
        :class="
          isInverted
            ? 'bg-mono-900 border-mono-500 text-mono-100'
            : 'text-teal-dark/80 bg-teal-light/40 border-teal-normal'
        "
      >
        {{ renderedTagline }}
      </p>
      <h2
        v-blokkli-editable:title
        class="text-2xl lg:text-4xl font-extrabold text-balance"
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
import { slugify } from '~/helpers'

const { parentType, fieldListType, options } = defineBlokkli({
  bundle: 'title',
  globalOptions: ['bkHiddenGlobally', 'bkVisibleLanguages', 'alignment'],
  options: {
    showInMenu: {
      type: 'checkbox',
      label: 'Show in menu',
      default: true,
    },
  },
  editor: {
    icon: 'bk_mdi_format_h2',
    addBehaviour: 'editable:title',
    previewWidth: 700,
    editTitle: (el) => el.querySelector('h2')?.textContent,
  },
  propsFieldMapping: {
    title: { type: 'editable', name: 'title' },
    tagline: { type: 'editable', name: 'tagline' },
    lead: { type: 'editable', name: 'lead' },
  },
})

const injectedInverted = inject<ComputedRef<boolean> | null>('isInverted', null)
const isInverted = computed(() => !!injectedInverted?.value)

export type Props = {
  title: string
  tagline?: string
  lead?: string
}

const props = defineProps<Props>()

const renderedTagline = computed(() => {
  return props.tagline || 'Fallback'
})

const id = computed(() =>
  options.value.showInMenu ? slugify(props.title) : undefined,
)

const isCentered = computed(
  () =>
    (props.lead || renderedTagline.value) &&
    (fieldListType.value === 'header' || !parentType.value),
)
</script>
