<template>
  <section
    :class="[
      spacing,
      BACKGROUNDS[options.background],
      { 'py-section': options.background !== 'none' },
    ]"
  >
    <div
      :class="options.columns === '1' ? 'container-content' : 'container-wide'"
    >
      <h2
        v-if="title || isEditing"
        :id="anchorId(title)"
        v-blokkli-editable:field_title
        :data-placeholder="$texts('placeholder.heading', 'Heading')"
        class="editable-placeholder mb-6 font-serif text-h2"
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
import { anchorId } from '~/helpers/anchor'
import { useBlockSpacing } from '~/composables/useBlockSpacing'

defineProps<ParagraphSectionFragment>()

const BACKGROUNDS = {
  none: '',
  stone: 'bg-surface',
  lake: 'bg-info-light',
} as const

// One column stacks the blocks, each with its own space above
// (useBlockSpacing). In a grid, the gaps space them.
const COLUMNS = {
  '1': '',
  '2': 'grid gap-x-grid gap-y-flow md:grid-cols-2 *:mt-0',
  '3': 'grid gap-x-grid gap-y-flow md:grid-cols-3 *:mt-0',
} as const

const block = defineBlokkli({
  bundle: 'section',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    background: {
      type: 'radios',
      label: { en: 'Background', de: 'Hintergrund', fr: 'Arrière-plan' },
      default: 'none',
      displayAs: 'colors',
      // The swatches are the -mid colours of the backgrounds (main.css).
      options: {
        none: {
          label: { en: 'None', de: 'Keiner', fr: 'Aucun' },
          class: 'bg-white',
        },
        stone: {
          label: { en: 'Stone', de: 'Stein', fr: 'Pierre' },
          class: 'bg-surface-mid',
        },
        lake: {
          label: { en: 'Lake', de: 'See', fr: 'Lac' },
          class: 'bg-info-mid',
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
const { options } = block
const spacing = useBlockSpacing(block)

const isEditing = import.meta.blokkliEditing
</script>
