<template>
  <BlokkliProvider
    v-slot="{ entity, isEditing }"
    v-bind="blokkliProps"
    :entity="props"
  >
    <HostLayout>
      <template #header>
        <HostHeader
          :title="entity.title"
          :lead="entity.lead"
          :image="entity.hero"
          :variant="options.header"
          :is-editing
        />
      </template>
      <BlokkliField
        name="field_paragraphs"
        :list="paragraphs"
        :allowed-fragments="['upcoming_events', 'latest_news']"
        class="flow"
      />
    </HostLayout>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { defineBlokkliProvider } from '#imports'
import { BlokkliField, BlokkliProvider } from '#components'
import type { NodeEditorialFragment } from '#graphql-operations'
import HostHeader from '~/components/Host/Header/index.vue'
import HostLayout from '~/components/Host/Layout/index.vue'

// The editorial page: the home page, overview pages and landing pages. A hero
// image and a free layout, no sidebar.
const props = defineProps<NodeEditorialFragment>()

const { options } = defineBlokkliProvider(props, {
  entityType: 'node',
  bundle: 'editorial',
  options: {
    header: {
      type: 'radios',
      label: { en: 'Header', de: 'Kopfbereich', fr: 'En-tête' },
      default: 'image',
      options: {
        image: {
          label: {
            en: 'Image below the title',
            de: 'Bild unter dem Titel',
            fr: 'Image sous le titre',
          },
        },
        overlay: {
          label: {
            en: 'Title on the image',
            de: 'Titel auf dem Bild',
            fr: "Titre sur l'image",
          },
        },
        plain: {
          label: { en: 'No image', de: 'Kein Bild', fr: 'Sans image' },
        },
      },
    },
  },
})
</script>
