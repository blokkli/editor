<template>
  <div
    v-blokkli-droppable:field_office
    :class="[
      spacing,
      {
        'container-content': !parentType && fieldListType === 'default',
        hidden: !office && !isEditing,
      },
    ]"
  >
    <template v-if="office">
      <!-- The sidebar: under a heading, on the white panel. -->
      <OfficeContact
        v-if="fieldListType === 'sidebar'"
        v-bind="office"
        :compact
      />
      <!-- The footer: a column on the ink ground. -->
      <div v-else-if="fieldListType === 'footer'" class="flex flex-col gap-2">
        <h2 class="text-label text-white uppercase">
          <SiteLink :to="office.url?.path" class="hover:underline">
            {{ office.title }}
          </SiteLink>
        </h2>
        <OfficeDetails v-bind="office" :compact />
      </div>
      <div v-else class="flex flex-col gap-4 border border-line bg-white p-6">
        <h3 class="font-serif text-h3 font-semibold">
          <SiteLink
            :to="office.url?.path"
            class="hover:text-primary hover:underline"
          >
            {{ office.title }}
          </SiteLink>
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
import { SiteLink } from '#components'
import type { ParagraphContactFragment } from '#graphql-operations'
import OfficeContact from '~/components/Office/Contact/index.vue'
import OfficeDetails from '~/components/Office/Details/index.vue'
import { useBlockSpacing } from '~/composables/useBlockSpacing'

defineProps<ParagraphContactFragment>()

const block = defineBlokkli({
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
const { options, parentType, fieldListType } = block
const spacing = useBlockSpacing(block)

const compact = computed(() => options.value.display === 'compact')

const isEditing = import.meta.blokkliEditing
</script>
