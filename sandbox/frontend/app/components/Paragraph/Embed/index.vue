<template>
  <div :class="[spacing, widthClass]">
    <BlokkliIframe v-if="src" :src :heights="options.heights">
      <iframe :src :title="title ?? undefined" class="block size-full" />
    </BlokkliIframe>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineBlokkli } from '#imports'
import { BlokkliIframe } from '#blokkli/iframes/components'
import type { ParagraphEmbedFragment } from '#graphql-operations'
import { useLanguage } from '~/composables/useLanguage'
import { getLanguageFromPath } from '#shared/languages'
import { WIDTH_CLASSES } from '~/helpers/width'
import { useBlockSpacing } from '~/composables/useBlockSpacing'
import { useBlockWidth } from '~/composables/useBlockWidth'

const props = defineProps<ParagraphEmbedFragment>()

// A page of this site in an iframe, e.g. the fee calculator
// (pages/embed), with heights per viewport from the iframes module.
const block = defineBlokkli({
  bundle: 'embed',
  globalOptions: ['width', 'bkVisibleLanguages'],
  options: {
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

// Full width makes no sense for an embed: it's as wide as "wide".
const width = useBlockWidth(block)
const widthClass = computed(() =>
  width.value
    ? WIDTH_CLASSES[width.value === 'content' ? 'content' : 'wide']
    : '',
)
</script>
