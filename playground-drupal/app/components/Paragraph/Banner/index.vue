<template>
  <div :class="style.band">
    <div
      v-blokkli-droppable:field_link
      class="container-wide flex items-start gap-3 py-3"
    >
      <SpriteSymbol
        :name="style.icon"
        class="mt-0.5 size-6 shrink-0"
        :class="style.text"
      />
      <component
        :is="url ? SiteLink : 'p'"
        :to="url"
        class="flex items-start gap-2"
        :class="{ 'group underline hover:no-underline': url }"
      >
        <span v-blokkli-editable:field_title>{{ text }}</span>
        <SpriteSymbol
          v-if="url"
          name="arrow-right"
          class="mt-1 size-5 shrink-0 transition-transform group-hover:translate-x-0.5"
        />
      </component>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineBlokkli } from '#imports'
import { SiteLink, SpriteSymbol } from '#components'
import type { ParagraphBannerFragment } from '#graphql-operations'

// A site-wide message above the header, e.g. a closure. With a link, the text
// is the link.
const props = defineProps<ParagraphBannerFragment>()

const url = computed(() => props.link?.uri?.path)

const STYLES = {
  warning: { band: 'bg-warning-light', icon: 'warning', text: 'text-warning' },
  info: { band: 'bg-info-light', icon: 'info', text: 'text-info' },
  success: { band: 'bg-success-light', icon: 'check', text: 'text-success' },
  error: { band: 'bg-error-light', icon: 'error', text: 'text-error' },
} as const

const { options } = defineBlokkli({
  bundle: 'banner',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    // The swatches are the bands' colours (the -light tokens in main.css).
    color: {
      type: 'radios',
      label: { en: 'Color', de: 'Farbe', fr: 'Couleur' },
      default: 'warning',
      displayAs: 'colors',
      options: {
        warning: {
          hex: '#fbf1dc',
          label: { en: 'Yellow', de: 'Gelb', fr: 'Jaune' },
        },
        info: { hex: '#e6eef6', label: { en: 'Blue', de: 'Blau', fr: 'Bleu' } },
        success: {
          hex: '#e5f0e8',
          label: { en: 'Green', de: 'Grün', fr: 'Vert' },
        },
        error: { hex: '#f3e4ec', label: { en: 'Red', de: 'Rot', fr: 'Rouge' } },
      },
    },
  },
  editor: {
    // Added with the field's default text, which is then edited in place.
    addBehaviour: 'editable:field_title',
    icon: 'bk_mdi_campaign',
    editTitle: (el) => el.textContent,
  },
})

const style = computed(() => STYLES[options.value.color])
</script>
