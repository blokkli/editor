<template>
  <BlokkliProvider
    v-slot="{ entity, isEditing }"
    v-bind="blokkliProps"
    :entity="props"
  >
    <article class="pb-20">
      <HostHeader
        :title="entity.title"
        :lead="entity.lead"
        :image="entity.hero"
        :variant="options.header"
        :is-editing
      />
      <div class="page-body mt-10">
        <BlokkliField
          name="field_paragraphs"
          :list="paragraphs"
          :allowed-fragments="['upcoming_events', 'latest_news']"
          class="flow"
        />
        <BlokkliField
          name="field_aside"
          :list="aside"
          field-list-type="secondary"
          non-empty-class="has-aside"
          edit-class="min-h-24"
          class="container-content flow mt-12"
        />
      </div>
    </article>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { defineBlokkliProvider } from '#imports'
import { BlokkliField, BlokkliProvider } from '#components'
import type { NodePageFragment } from '#graphql-operations'
import HostHeader from '~/components/Host/Header/index.vue'

const props = defineProps<NodePageFragment>()

const { options } = defineBlokkliProvider(props, {
  entityType: 'node',
  bundle: 'page',
  options: {
    header: {
      type: 'radios',
      label: { en: 'Header', de: 'Kopfbereich', fr: 'En-tête' },
      default: 'image',
      options: {
        image: {
          label: {
            en: 'Image above the title',
            de: 'Bild über dem Titel',
            fr: 'Image au-dessus du titre',
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
