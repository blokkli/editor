<template>
  <section class="py-12" :class="BACKGROUNDS[options.background]">
    <div
      :class="options.columns === '1' ? 'container-content' : 'container-wide'"
    >
      <h2
        v-if="title || isEditing"
        v-blokkli-editable:field_title
        :data-placeholder="$texts('placeholder.heading', 'Heading')"
        class="editable-placeholder mb-8 font-serif text-h2"
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
  stone: 'bg-surface',
  lake: 'bg-info-light',
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
      label: { en: 'Background', de: 'Hintergrund', fr: 'Arrière-plan' },
      default: 'none',
      displayAs: 'colors',
      options: {
        none: {
          label: { en: 'None', de: 'Keiner', fr: 'Aucun' },
          hex: '#ffffff',
        },
        stone: {
          label: { en: 'Stone', de: 'Stein', fr: 'Pierre' },
          hex: '#f5f2ee',
        },
        lake: {
          label: { en: 'Lake', de: 'See', fr: 'Lac' },
          hex: '#e6eef6',
        },
      },
    },
    columns: {
      type: 'radios',
      label: { en: 'Columns', de: 'Spalten', fr: 'Colonnes' },
      default: '1',
      displayAs: 'grid',
      options: {
        '1': {
          label: { en: 'One column', de: 'Eine Spalte', fr: 'Une colonne' },
          columns: [1],
        },
        '2': {
          label: { en: 'Two columns', de: 'Zwei Spalten', fr: 'Deux colonnes' },
          columns: [1, 1],
        },
        '3': {
          label: {
            en: 'Three columns',
            de: 'Drei Spalten',
            fr: 'Trois colonnes',
          },
          columns: [1, 1, 1],
        },
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
