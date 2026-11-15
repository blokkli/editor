<template>
  <div :class="[spacing, { 'container-wide': hasContainer }]">
    <CompositionRenderer
      v-if="hasSource"
      :document="options.document"
      :children="paragraphs"
      field-name="field_paragraphs"
    />
    <p v-else-if="isEditing" class="bg-surface p-4 text-muted">
      {{
        $texts(
          'composition.empty',
          'An empty composition: ask the assistant to design one, or write its source in the options.',
        )
      }}
    </p>
  </div>
</template>

<script lang="ts" setup>
import type { ParagraphCompositionFragment } from '#graphql-operations'
import { CompositionRenderer } from '#blokkli/composition/components'

// A bespoke section: markup with the primitives of blokkli/composition and
// HTML elements, and its CSS, in a block option that the server compiles and
// checks before it renders. The paragraphs it places (images) are in
// field_paragraphs; the markup places each by its key.
defineProps<ParagraphCompositionFragment>()

const block = defineBlokkli({
  bundle: 'composition',
  options: {
    document: {
      type: 'json',
      label: { en: 'Composition', de: 'Komposition', fr: 'Composition' },
      default: '{"version":2,"source":""}',
      dataType: 'composition',
    },
  },
  propsFieldMapping: {
    paragraphs: { type: 'field', name: 'field_paragraphs' },
  },
  editor: {
    icon: 'bk_mdi_dashboard',
    previewWidth: 1200,
    addBehaviour: 'no-form',
    disableEdit: true,
  },
})
const { options } = block
const isEditing = import.meta.blokkliEditing
const spacing = useBlockSpacing(block)
const hasContainer = useHasContainer(block)

const hasSource = computed(() => !!options.value.document?.source?.trim())
</script>
