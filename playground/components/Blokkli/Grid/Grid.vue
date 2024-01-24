<template>
  <section
    class="py-70"
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
    <BlokkliField
      name="blocks"
      :list="blocks"
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
import type { FieldListItemTyped } from '#blokkli/generated-types'
import { defineBlokkli, computed, provide } from '#imports'

const { options } = defineBlokkli({
  bundle: 'grid',
  globalOptions: ['background'],
  options: {
    columns: {
      type: 'radios',
      label: 'Columns',
      default: 'two',
      displayAs: 'icons',
      options: {
        two: 'icon-blokkli-option-two',
        three: 'icon-blokkli-option-three',
        four: 'icon-blokkli-option-four',
      },
    },
    mobile: {
      type: 'checkbox',
      label: 'Mobile',
      default: '1',
    },
    countries: {
      type: 'checkboxes',
      label: 'Countries',
      default: 'ch,de,at',
      options: {
        ch: 'Switzerland',
        de: 'Germany',
        at: 'Austria',
        it: 'Italy',
        fr: 'France',
      },
    },
    anchorId: {
      type: 'text',
      label: 'Anchor ID',
      default: '',
      inputType: 'text',
    },
    buttonType: {
      type: 'radios',
      label: 'Button Type',
      default: 'primary',
      options: {
        primary: 'Primary',
        secondary: 'Secondary',
      },
    },
    columnsGrid: {
      type: 'radios',
      label: 'Columns',
      default: 'equal',
      displayAs: 'grid',
      options: {
        equal: [1, 1], // 50% / 50%
        oneTwo: [1, 2], // 33% / 66%
        twoOne: [2, 1], // 66% / 33%
        quarterOne: [3, 1], // 75% / 25%
      },
    },
    color: {
      type: 'radios',
      label: 'Color',
      default: 'white',
      displayAs: 'colors',
      options: {
        normal: '#FFFFFF', // White
        primary: '#0550e6', // Blue
      },
    },
  },
  editor: {
    disableEdit: true,
    editTitle: (el) => el.querySelector('h2')?.innerText,
  },
})

defineProps<{
  header: FieldListItemTyped[]
  blocks: FieldListItemTyped[]
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
