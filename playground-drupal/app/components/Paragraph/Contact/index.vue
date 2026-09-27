<template>
  <div
    v-blokkli-droppable:field_office
    :class="{
      'container-content': !parentType && fieldListType === 'default',
      hidden: !office && !isEditing,
    }"
  >
    <template v-if="office">
      <!-- The sidebar: under a heading, on the white panel. -->
      <div v-if="fieldListType === 'sidebar'" class="flex flex-col gap-3">
        <h2 class="border-b border-ink pb-2.5 text-label text-muted uppercase">
          {{ $texts('contact.label', 'Contact') }}
        </h2>
        <p class="font-serif text-h3 font-semibold">
          <a
            :href="office.url?.path"
            class="hover:text-primary hover:underline"
          >
            {{ office.title }}
          </a>
        </p>
        <OfficeDetails v-bind="office" :compact />
      </div>
      <!-- The footer: a column on the ink ground. -->
      <div v-else-if="fieldListType === 'footer'" class="flex flex-col gap-2">
        <h2 class="text-label text-white uppercase">
          <a :href="office.url?.path" class="hover:underline">
            {{ office.title }}
          </a>
        </h2>
        <OfficeDetails v-bind="office" :compact />
      </div>
      <div v-else class="flex flex-col gap-4 border border-line bg-white p-6">
        <h3 class="font-serif text-h3 font-semibold">
          <a
            :href="office.url?.path"
            class="hover:text-primary hover:underline"
          >
            {{ office.title }}
          </a>
        </h3>
        <OfficeDetails v-bind="office" :compact />
      </div>
    </template>
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
import { computed, defineBlokkli } from '#imports'
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
    editTitle: (el) => el.querySelector('a')?.textContent,
  },
})

const compact = computed(() => options.value.display === 'compact')

const isEditing = import.meta.blokkliEditing
</script>
