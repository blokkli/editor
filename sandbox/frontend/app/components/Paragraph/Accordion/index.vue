<template>
  <div
    :class="[continued ? '' : spacing, { 'container-content': hasContainer }]"
  >
    <div
      :class="
        continued
          ? 'border-b border-line'
          : 'border-y border-t-ink border-b-line'
      "
    >
      <h3 class="text-h3">
        <span
          v-if="isEditing"
          v-blokkli-editable:field_title
          :data-placeholder="$texts('placeholder.title', 'Title')"
          class="editable-placeholder block py-4"
        >
          {{ title }}
        </span>
        <button
          v-else
          type="button"
          class="flex w-full items-center justify-between gap-4 py-4 text-left hover:text-primary"
          :aria-expanded="isOpen"
          data-test="accordion-toggle"
          @click="isOpen = !isOpen"
        >
          {{ title }}
          <SpriteSymbol
            :name="isOpen ? 'minus' : 'plus'"
            class="size-5 shrink-0 text-primary"
          />
        </button>
      </h3>
      <!-- A class, not v-show: on a page rendered on the server, the CSP blocks
      the style attribute that v-show renders. -->
      <div class="pb-6" :class="{ hidden: !isOpen && !isEditing }">
        <BlokkliField
          name="field_paragraphs"
          :list="paragraphs"
          edit-class="min-h-16"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ParagraphAccordionFragment } from '#graphql-operations'

defineProps<ParagraphAccordionFragment>()

const isOpen = ref(false)

// One block is one item. Consecutive items form one list: no space between
// them, and only the first one has the ink rule on top.
const block = defineBlokkli({
  bundle: 'accordion',
  // The toggle needs the browser, from when the accordion is seen. The blocks
  // inside hydrate with it.
  hydrate: 'visible',
  globalOptions: ['bkVisibleLanguages'],
  propsFieldMapping: {
    title: { type: 'editable', name: 'field_title' },
    paragraphs: { type: 'field', name: 'field_paragraphs' },
  },
  editor: {
    addBehaviour: 'editable:field_title',
    icon: 'bk_mdi_view_agenda',
    editTitle: (el) => el.querySelector('h3')?.textContent,
  },
})
const spacing = useBlockSpacing(block)
const hasContainer = useHasContainer(block)
const continued = computed(
  () => block.siblings.value[block.index.value - 1]?.bundle === 'accordion',
)

const isEditing = import.meta.blokkliEditing
</script>
