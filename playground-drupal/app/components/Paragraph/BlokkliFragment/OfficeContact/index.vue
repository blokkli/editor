<template>
  <div :class="{ hidden: !office && !isEditing }">
    <OfficeContact v-if="office" v-bind="office" />
    <p v-else-if="isEditing" class="bg-surface p-4 text-muted">
      {{
        $texts(
          'office_contact.empty',
          "Choose the responsible office in the page's form.",
        )
      }}
    </p>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineBlokkliFragment } from '#imports'
import OfficeContact from '~/components/Office/Contact/index.vue'
import { usePageOffice } from '~/composables/usePageOffice'

// The contact of the detail page's responsible office (field_office). New
// detail pages start with it in their sidebar, and editors place blocks around
// it.
defineBlokkliFragment({
  name: 'office_contact',
  label: 'Contact',
  description: "The contact of the page's responsible office.",
  editor: {
    icon: 'bk_mdi_contact_page',
    previewWidth: 400,
  },
})

const pageOffice = usePageOffice()
const office = computed(() => pageOffice?.value)

const isEditing = import.meta.blokkliEditing
</script>
