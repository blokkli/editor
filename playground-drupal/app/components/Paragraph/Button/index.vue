<template>
  <div class="container-content">
    <a
      v-blokkli-droppable:field_link
      :href
      class="inline-block rounded-full border-2 px-6 py-3 font-semibold"
      :class="
        options.style === 'secondary'
          ? 'border-stone-900 text-stone-900'
          : 'border-stone-900 bg-stone-900 text-white'
      "
    >
      <span v-blokkli-editable:field_title>{{ label }}</span>
    </a>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineBlokkli } from '#imports'
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

const label = computed(() => {
  const uri = props.link?.uri
  const entityLabel = uri && 'entity' in uri ? uri.entity?.label : undefined
  return props.title || entityLabel || 'Button'
})

const { options } = defineBlokkli({
  bundle: 'button',
  options: {
    style: {
      type: 'radios',
      label: 'Style',
      default: 'primary',
      options: {
        primary: 'Primary',
        secondary: 'Secondary',
      },
    },
  },
  editor: {
    icon: 'bk_mdi_buttons_alt',
    editTitle: (el) => el.textContent,
  },
})
</script>
