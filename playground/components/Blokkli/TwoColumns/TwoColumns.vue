<template>
  <div class="py-30 md:py-60 lg:py-100" :class="colorClass">
    <BlokkliField
      v-bind="fieldHeader"
      class="container mb-20"
      field-list-type="header"
    />
    <div class="container mx-auto grid gap-20 lg:gap-40 grid-cols-12">
      <BlokkliField
        v-bind="fieldLeft"
        class="flex flex-col gap-20"
        :class="{
          'col-span-6': options.columns === 'equal',
          'col-span-4': options.columns === 'oneTwo',
          'col-span-8': options.columns === 'twoOne',
        }"
      />
      <BlokkliField
        v-bind="fieldRight"
        :class="{
          'md:order-first': options.reverse,
          'col-span-6': options.columns === 'equal',
          'col-span-8': options.columns === 'oneTwo',
          'col-span-4': options.columns === 'twoOne',
        }"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { mapMockField } from '~/app/mock/state'
import type { FieldBlocks } from '~/app/mock/state/Field/Blocks'

const { options } = defineBlokkli({
  bundle: 'two_columns',
  disableEdit: true,
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
})

const props = defineProps<{
  header: FieldBlocks
  left: FieldBlocks
  right: FieldBlocks
}>()

const fieldHeader = computed(() => mapMockField(props.header))
const fieldLeft = computed(() => mapMockField(props.left))
const fieldRight = computed(() => mapMockField(props.right))

const colorClass = computed(() => {
  switch (options.value.background) {
    case 'dark':
      return 'bg-slate-800'
    case 'light':
      return 'bg-slate-100'
  }
  return 'bg-white'
})

const isInverted = computed(() => options.value.background === 'dark')
provide('isInverted', isInverted)
</script>

<style></style>
