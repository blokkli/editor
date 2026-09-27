<template>
  <div
    v-blokkli-droppable:field_office
    :class="{
      'container-content': !parentType && fieldListType === 'default',
      hidden: !office && !isEditing,
    }"
  >
    <div v-if="office" class="border border-line bg-white p-6">
      <h3 class="mb-4 text-h3">
        <a :href="office.url?.path" class="hover:underline">
          {{ office.title }}
        </a>
      </h3>
      <OfficeDetails v-bind="office" :compact="options.display === 'compact'" />
    </div>
    <p v-else-if="isEditing" class="bg-surface p-4 text-muted">
      {{
        $texts(
          'contact.unavailable',
          "The office of this contact isn't available.",
        )
      }}
    </p>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'
import type { ParagraphContactFragment } from '#graphql-operations'
import OfficeDetails from '~/components/Office/Details/index.vue'

defineProps<ParagraphContactFragment>()

const { options, parentType, fieldListType } = defineBlokkli({
  bundle: 'contact',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    display: {
      type: 'radios',
      label: { en: 'Display', de: 'Darstellung', fr: 'Affichage' },
      default: 'full',
      options: {
        full: { label: { en: 'Full', de: 'Vollständig', fr: 'Complet' } },
        compact: { label: { en: 'Compact', de: 'Kompakt', fr: 'Compact' } },
      },
    },
  },
  editor: {
    icon: 'bk_mdi_contact_page',
    editTitle: (el) => el.querySelector('h3')?.textContent,
  },
})

const isEditing = import.meta.blokkliEditing
</script>
