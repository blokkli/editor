<template>
  <div
    class="py-30 md:py-60 lg:py-100"
    :id="options.anchorId"
    :class="[
      colorClass,
      { 'border-t border-t-mono-200': options.background === 'white' },
    ]"
  >
    <BlokkliField
      name="header"
      :list="header"
      class="container"
      non-empty-class="mb-30 md:mb-70"
      edit-class="min-h-[50px]"
      field-list-type="header"
    />
    <div class="container mx-auto grid gap-30 lg:gap-40 grid-cols-12">
      <BlokkliField
        name="left"
        :list="left"
        class="flex flex-col gap-20 col-span-12"
        field-list-type="inline"
        edit-class="min-h-[50px]"
        :class="{
          'md:col-span-6': options.columns === 'equal',
          'md:col-span-4': options.columns === 'oneTwo',
          'md:col-span-8': options.columns === 'twoOne',
        }"
      />
      <BlokkliField
        name="right"
        :list="right"
        class="col-span-12"
        edit-class="min-h-[50px]"
        :class="{
          'md:order-first': options.reverse,
          'md:col-span-6': options.columns === 'equal',
          'md:col-span-8': options.columns === 'oneTwo',
          'md:col-span-4': options.columns === 'twoOne',
        }"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { FieldListItemTypedArray } from '#blokkli-build/generated-types'
import { defineBlokkli, computed, provide } from '#imports'

const { options } = defineBlokkli({
  bundle: 'two_columns',
  globalOptions: ['background'],
  options: {
    columns: {
      type: 'radios',
      label: 'Columns',
      default: 'equal',
      description: 'Define how wide the columns are.',
      displayAs: 'grid',
      options: {
        equal: {
          columns: [1, 1],
          label: 'Equal',
          description: 'Same width for both colums',
        },
        oneTwo: {
          columns: [1, 2],
          label: 'One / Two',
          description: 'Use when you want a large image',
        },
        twoOne: {
          columns: [2, 1],
          label: 'Two / One',
          description: 'Use when you want a small image',
        },
      },
    },
    reverse: {
      type: 'checkbox',
      label: 'Reverse',
      default: false,
    },
    anchorId: {
      type: 'text',
      label: 'Anchor ID',
      default: '',
    },
  },
  propsFieldMapping: {
    header: {
      type: 'field',
      name: 'header',
    },
    left: { type: 'field', name: 'left' },
    right: { type: 'field', name: 'right' },
  },
  editor: {
    disableEdit: true,
    icon: 'bk_mdi_looks_two',
    editTitle: (el) => el.querySelector('h2')?.textContent,
    fieldLayout: [['header'], ['left', 'right']],
  },
})

export type Props = {
  header: FieldListItemTypedArray
  left: FieldListItemTypedArray
  right: any[]
}

defineProps<Props>()

const colorClass = computed(() => {
  switch (options.value.background) {
    case 'dark':
      return 'bg-mono-800'
    case 'light':
      return 'bg-mono-100'
  }
  return 'bg-white'
})

const isInverted = computed(() => options.value.background === 'dark')
provide('isInverted', isInverted)
</script>
