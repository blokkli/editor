<template>
  <div :class="[spacing, width && WIDTH_CLASSES[width]]">
    <BlokkliIframe v-if="src" :src :heights="options.heights">
      <iframe :src :title="title ?? undefined" class="block size-full" />
    </BlokkliIframe>
  </div>
</template>

<script lang="ts" setup>
import { BlokkliIframe } from '#blokkli/iframes/components'
import type { ParagraphEmbedFragment } from '#graphql-operations'

const props = defineProps<ParagraphEmbedFragment>()

// A page of this site in an iframe, e.g. the fee calculator
// (pages/embed), with heights per viewport from the iframes module.
const block = defineBlokkli({
  bundle: 'embed',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    // The global width option without "Full", which is no wider than "Wide"
    // here.
    width: {
      type: 'radios',
      label: { en: 'Width', de: 'Breite', fr: 'Largeur' },
      default: 'content',
      displayAs: 'icons',
      options: {
        content: {
          label: { en: 'Content', de: 'Inhalt', fr: 'Contenu' },
          icon: 'bk_mdi_width_normal',
        },
        wide: {
          label: { en: 'Wide', de: 'Breit', fr: 'Large' },
          icon: 'bk_mdi_width_wide',
        },
      },
    },
    heights: {
      type: 'json',
      label: { en: 'Heights', de: 'Höhen', fr: 'Hauteurs' },
      default: '{}',
      dataType: 'iframe_heights',
    },
  },
  editor: {
    icon: 'bk_mdi_fit_screen',
    previewWidth: 800,
    editTitle: (el) => el.querySelector('iframe')?.title,
    // Not in nested blocks and on detail pages, where it has no effect
    // (useBlockWidth).
    determineVisibleOptions: (ctx) =>
      ctx.parentType || ctx.entity.entityBundle === 'page'
        ? ['heights']
        : ['width', 'heights'],
  },
})
const { options } = block
const spacing = useBlockSpacing(block)
const width = useBlockWidth(block)

// The link is the same in every language: the page is shown in the language
// of the page the embed is placed on, like Drupal renders internal links. The
// prefix also keeps it on this site.
const language = useLanguage()
const src = computed(() => {
  const path = props.link?.uri?.path
  if (!path) {
    return null
  }
  const current = getLanguageFromPath(path)
  return `/${language.value}${current ? path.slice(current.length + 1) : path}`
})
</script>
