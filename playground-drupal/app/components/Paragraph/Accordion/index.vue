<template>
  <div class="accordion" :class="{ 'container-content': !parentType }">
    <div class="border-y border-stone-300">
      <h3 class="text-lg font-semibold">
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
          class="flex w-full items-center justify-between gap-4 py-4 text-left"
          :aria-expanded="isOpen"
          @click="isOpen = !isOpen"
        >
          {{ title }}
          <span
            aria-hidden="true"
            class="transition-transform"
            :class="{ 'rotate-180': isOpen }"
          >
            ▾
          </span>
        </button>
      </h3>
      <div v-show="isOpen || isEditing" class="pb-6">
        <BlokkliField
          name="field_paragraphs"
          :list="paragraphs"
          class="flow"
          edit-class="min-h-16"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, ref } from '#imports'
import type { ParagraphAccordionFragment } from '#graphql-operations'

defineProps<ParagraphAccordionFragment>()

const isOpen = ref(false)

// One block is one item. Consecutive items form one list (main.css).
const { parentType } = defineBlokkli({
  bundle: 'accordion',
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

const isEditing = import.meta.blokkliEditing
</script>
