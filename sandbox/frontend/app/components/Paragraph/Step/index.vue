<template>
  <li class="border-b border-line py-4">
    <div ref="blokkliDraggable" class="flex gap-4">
      <Tile tone="primary" class="text-h3 font-bold">
        {{ index + 1 }}
      </Tile>
      <div>
        <h3 v-blokkli-editable:field_title class="text-h3">{{ title }}</h3>
        <div
          v-if="text || isEditing"
          v-blokkli-editable:field_text
          :data-placeholder="$texts('placeholder.text', 'Text')"
          class="editable-placeholder rich-text"
          v-html="text"
        />
      </div>
    </div>
  </li>
</template>

<script lang="ts" setup>
import type { ParagraphStepFragment } from '#graphql-operations'

// One step of the steps (Steps/index.vue): its number, a title and a text.
// The <ol> numbers them for screen readers. In the editor, the step is its
// content (blokkliDraggable): a click on the row's padding selects the steps,
// which have no space of their own.
defineProps<ParagraphStepFragment>()

const { index } = defineBlokkli({
  bundle: 'step',
  globalOptions: ['bkVisibleLanguages'],
  editor: {
    // Added with the title's default text, which is then edited in place.
    addBehaviour: 'editable:field_title',
    icon: 'bk_mdi_counter_1',
    editTitle: (el) => el.querySelector('h3')?.textContent,
  },
})

const isEditing = import.meta.blokkliEditing
</script>
