<template>
  <div :class="[spacing, { 'container-content': hasContainer }]">
    <Callout v-if="box" :type="box">
      <div v-blokkli-editable:field_text class="rich-text" v-html="text" />
    </Callout>
    <div v-else v-blokkli-editable:field_text class="rich-text" v-html="text" />
  </div>
</template>

<script lang="ts" setup>
import type { ParagraphTextFragment } from '#graphql-operations'

// Rich text, or an info box: the box option puts the text in a callout.
defineProps<ParagraphTextFragment>()

const block = defineBlokkli({
  bundle: 'text',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    // The swatches are the -mid colours of the boxes' light ones (main.css).
    box: {
      type: 'radios',
      label: { en: 'Info box', de: 'Infobox', fr: 'Encadré' },
      default: 'none',
      displayAs: 'colors',
      options: {
        none: {
          class: 'bg-white',
          label: { en: 'None', de: 'Keine', fr: 'Aucun' },
        },
        info: {
          class: 'bg-info-mid',
          label: { en: 'Blue', de: 'Blau', fr: 'Bleu' },
        },
        success: {
          class: 'bg-success-mid',
          label: { en: 'Green', de: 'Grün', fr: 'Vert' },
        },
        warning: {
          class: 'bg-warning-mid',
          label: { en: 'Yellow', de: 'Gelb', fr: 'Jaune' },
        },
        error: {
          class: 'bg-error-mid',
          label: { en: 'Red', de: 'Rot', fr: 'Rouge' },
        },
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
const { options, fieldListType } = block
const spacing = useBlockSpacing(block)
const hasContainer = useHasContainer(block)

const box = computed(() =>
  options.value.box === 'none' || fieldListType.value !== 'default'
    ? null
    : options.value.box,
)
</script>
