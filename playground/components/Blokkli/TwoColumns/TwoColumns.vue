<template>
  <div
    class="py-30 md:py-60 lg:py-100"
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
      field-list-type="header"
    />
    <div class="container mx-auto grid gap-30 lg:gap-40 grid-cols-12">
      <BlokkliField
        name="left"
        :list="left"
        class="flex flex-col gap-20 col-span-12"
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
import type { FieldListItemTypedArray } from '#blokkli/generated-types'
import { defineBlokkli, computed, provide } from '#imports'

const { options } = defineBlokkli({
  bundle: 'two_columns',
  globalOptions: ['background'],
  options: {
    columns: {
      type: 'radios',
      label: 'Columns',
      default: 'equal',
      displayAs: 'grid',
      options: {
        equal: [1, 1],
        oneTwo: [1, 2],
        twoOne: [2, 1],
      },
    },
    reverse: {
      type: 'checkbox',
      label: 'Reverse',
      default: '0',
    },
  },
  editor: {
    disableEdit: true,
    editTitle: (el) => el.querySelector('h2')?.innerText,
  },
})

defineProps<{
  header: FieldListItemTypedArray
  left: FieldListItemTypedArray
  right: any[]
}>()

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

<style></style>
