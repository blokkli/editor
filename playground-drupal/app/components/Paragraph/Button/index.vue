<template>
  <div
    :class="{ 'container-content': !parentType && fieldListType === 'default' }"
  >
    <a
      v-blokkli-droppable:field_link
      :href
      class="button"
      :class="{
        'is-secondary': options.style === 'secondary',
        'is-on-dark': fieldListType === 'footer',
        'w-full': fieldListType === 'sidebar',
      }"
    >
      <span v-blokkli-editable:field_title>{{ label }}</span>
    </a>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineBlokkli, useEasyTexts } from '#imports'
import type { ParagraphButtonFragment } from '#graphql-operations'

const props = defineProps<ParagraphButtonFragment>()

// A button linking to a document (e.g. a pasted PDF) links to the file.
const href = computed(() => {
  const uri = props.link?.uri
  if (uri && 'entity' in uri && uri.entity && 'mediaFileUrl' in uri.entity) {
    return uri.entity.mediaFileUrl?.path ?? uri.path ?? undefined
  }
  return uri?.path ?? undefined
})

const { $texts } = useEasyTexts()

const label = computed(() => {
  const uri = props.link?.uri
  const entityLabel = uri && 'entity' in uri ? uri.entity?.label : undefined
  return props.title || entityLabel || $texts('button.label', 'Button')
})

const { options, parentType, fieldListType } = defineBlokkli({
  bundle: 'button',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    style: {
      type: 'radios',
      label: { en: 'Style', de: 'Stil', fr: 'Style' },
      default: 'primary',
      options: {
        primary: { label: { en: 'Primary', de: 'Primär', fr: 'Principal' } },
        secondary: {
          label: { en: 'Secondary', de: 'Sekundär', fr: 'Secondaire' },
        },
      },
    },
  },
  editor: {
    icon: 'bk_mdi_buttons_alt',
    editTitle: (el) => el.textContent,
  },
})
</script>
