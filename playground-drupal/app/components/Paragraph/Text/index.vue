<template>
  <div
    :class="{ 'container-content': !parentType && fieldListType === 'default' }"
  >
    <Callout v-if="box" :type="box">
      <div v-blokkli-editable:field_text class="rich-text" v-html="text" />
    </Callout>
    <div v-else v-blokkli-editable:field_text class="rich-text" v-html="text" />
  </div>
</template>

<script lang="ts" setup>
import { computed, defineBlokkli } from '#imports'
import { Callout } from '#components'
import type { ParagraphTextFragment } from '#graphql-operations'

// Rich text, or an info box: the box option puts the text in a callout.
defineProps<ParagraphTextFragment>()

const { options, parentType, fieldListType } = defineBlokkli({
  bundle: 'text',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    // The swatches are the boxes' colours (the -light tokens in main.css), as
    // on the banner.
    box: {
      type: 'radios',
      label: { en: 'Info box', de: 'Infobox', fr: 'Encadré' },
      default: 'none',
      displayAs: 'colors',
      options: {
        none: {
          hex: '#ffffff',
          label: { en: 'None', de: 'Keine', fr: 'Aucun' },
        },
        info: { hex: '#e6eef6', label: { en: 'Blue', de: 'Blau', fr: 'Bleu' } },
        success: {
          hex: '#e5f0e8',
          label: { en: 'Green', de: 'Grün', fr: 'Vert' },
        },
        warning: {
          hex: '#fbf1dc',
          label: { en: 'Yellow', de: 'Gelb', fr: 'Jaune' },
        },
        error: { hex: '#f3e4ec', label: { en: 'Red', de: 'Rot', fr: 'Rouge' } },
      },
    },
  },
  editor: {
    addBehaviour: 'editable:field_text',
    icon: 'bk_mdi_notes',
    editTitle: (el) => el.querySelector('.rich-text')?.textContent,
    // Only in the page's blocks: not in the footer.
    determineVisibleOptions: (ctx) =>
      ctx.fieldListType === 'default' ? ['box'] : [],
  },
})

const box = computed(() =>
  options.value.box === 'none' || fieldListType.value !== 'default'
    ? null
    : options.value.box,
)
</script>
