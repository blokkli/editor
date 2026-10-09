<template>
  <h2
    :id="anchorId(options.anchor || title)"
    v-blokkli-editable:field_title
    class="font-serif text-h2"
    :class="[spacing, { 'container-content': hasContainer }]"
  >
    {{ title }}
  </h2>
</template>

<script lang="ts" setup>
import type { ParagraphTitleFragment } from '#graphql-operations'

// A heading. Its id, for links and the table of contents, is the anchor
// option or else the title's, as a slug (anchorId()). An anchor is the same in
// every language, so a link to it works in all of them.
defineProps<ParagraphTitleFragment>()

const block = defineBlokkli({
  bundle: 'title',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    anchor: {
      type: 'text',
      label: { en: 'Anchor', de: 'Anker', fr: 'Ancre' },
      description: {
        en: 'The ID in links to this heading, the same in every language. Without it, links use the title.',
        de: 'Die ID in Links zu diesem Titel, in allen Sprachen gleich. Ohne sie verwenden Links den Titel.',
        fr: 'L’ID dans les liens vers ce titre, le même dans toutes les langues. Sans lui, les liens utilisent le titre.',
      },
      placeholder: { en: 'contact', de: 'kontakt', fr: 'contact' },
      default: '',
      group: 'Navigation',
    },
    toc: {
      type: 'checkbox',
      label: {
        en: 'In the table of contents',
        de: 'Im Inhaltsverzeichnis',
        fr: 'Dans la table des matières',
      },
      default: true,
      group: 'Navigation',
    },
  },
  editor: {
    addBehaviour: 'editable:field_title',
    icon: 'bk_mdi_format_h2',
    editTitle: (el) => el.textContent,
    // Only detail pages have a table of contents.
    determineVisibleOptions: (ctx) =>
      ctx.entity.entityBundle === 'page' ? ['anchor', 'toc'] : ['anchor'],
  },
})
const { options } = block
const spacing = useBlockSpacing(block)
const hasContainer = useHasContainer(block)
</script>
