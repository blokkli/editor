<template>
  <section class="py-12" :class="BACKGROUNDS[options.background]">
    <div
      :class="options.columns === '1' ? 'container-content' : 'container-wide'"
    >
      <h2
        v-if="title || isEditing"
        v-blokkli-editable:field_title
        data-placeholder="Heading"
        class="editable-placeholder mb-8 text-2xl font-bold md:text-3xl"
      >
        {{ title }}
      </h2>
      <BlokkliField
        name="field_paragraphs"
        :list="paragraphs"
        :class="COLUMNS[options.columns]"
        :drop-alignment="options.columns === '1' ? 'vertical' : 'horizontal'"
        edit-class="min-h-24"
      />
    </div>
  </section>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'
import type { ParagraphSectionFragment } from '#graphql-operations'

defineProps<ParagraphSectionFragment>()

const BACKGROUNDS = {
  none: '',
  stone: 'bg-stone-200',
  lake: 'bg-sky-100',
} as const

const COLUMNS = {
  '1': 'flow',
  '2': 'grid gap-8 md:grid-cols-2',
  '3': 'grid gap-8 md:grid-cols-3',
} as const

const { options } = defineBlokkli({
  bundle: 'section',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    background: {
      type: 'radios',
      label: 'Background',
      default: 'none',
      displayAs: 'colors',
      options: {
        none: { label: 'None', hex: '#fafaf9' },
        stone: { label: 'Stone', hex: '#e7e5e4' },
        lake: { label: 'Lake', hex: '#e0f2fe' },
      },
    },
    columns: {
      type: 'radios',
      label: 'Columns',
      default: '1',
      displayAs: 'grid',
      options: {
        '1': { label: 'One column', columns: [1] },
        '2': { label: 'Two columns', columns: [1, 1] },
        '3': { label: 'Three columns', columns: [1, 1, 1] },
      },
    },
  },
  propsFieldMapping: {
    title: { type: 'editable', name: 'field_title' },
    paragraphs: { type: 'field', name: 'field_paragraphs' },
  },
  editor: {
    addBehaviour: 'no-form',
    icon: 'bk_mdi_rectangle',
    editTitle: (el) => el.querySelector(':scope > div > h2')?.textContent,
  },
})

const isEditing = import.meta.blokkliEditing
</script>
