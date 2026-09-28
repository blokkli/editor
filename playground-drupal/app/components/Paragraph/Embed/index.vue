<template>
  <div :class="widthClass">
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

const props = defineProps<ParagraphEmbedFragment>()

// A page of this site in an iframe, e.g. the fee calculator
// (pages/[lang]/embed), with heights per viewport from the iframes module.
const { options, parentType } = defineBlokkli({
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
    determineVisibleOptions: (ctx) =>
      ctx.parentType ? ['heights'] : ['width', 'heights'],
  },
})

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
const widthClass = computed(() =>
  parentType.value
    ? ''
    : WIDTH_CLASSES[options.value.width === 'content' ? 'content' : 'wide'],
)
</script>
