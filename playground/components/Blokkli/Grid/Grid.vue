<template>
  <section class="py-70" :class="colorClass">
    <BlokkliField
      v-bind="fieldHeader"
      class="container mb-20"
      field-list-type="header"
    />
    <BlokkliField
      v-bind="fieldBlocks"
      class="container grid gap-20 lg:gap-40"
      :class="{
        'grid-cols-2': options.mobile === '1',
        'lg:grid-cols-2': options.columns === 'two',
        'lg:grid-cols-3': options.columns === 'three',
        'lg:grid-cols-4': options.columns === 'four',
      }"
    />
  </section>
</template>

<script lang="ts" setup>
import { mapMockField } from '~/app/mock/state'
import type { FieldBlocks } from '~/app/mock/state/Field/Blocks'

const { options } = defineBlokkli({
  bundle: 'grid',
  disableEdit: true,
  globalOptions: ['background'],
  options: {
    columns: {
      type: 'radios',
      label: 'Columns',
      default: 'two',
      displayAs: 'grid',
      options: {
        two: [1, 1],
        three: [1, 1, 1],
        four: [1, 1, 1, 1],
      },
    },
    mobile: {
      type: 'checkbox',
      label: 'Mobile',
      default: '1',
    },
  },
})

const props = defineProps<{
  header: FieldBlocks
  blocks: FieldBlocks
}>()

const fieldHeader = computed(() => mapMockField(props.header))
const fieldBlocks = computed(() => mapMockField(props.blocks))

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
