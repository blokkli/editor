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
          :breadcrumb
        />
      </template>
      <SubPages
        v-if="options.subPages && subPages?.length"
        :items="subPages"
        class="mb-10"
      />
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
import type {
  BreadcrumbFragment,
  NodeEditorialFragment,
} from '#graphql-operations'
import HostHeader from '~/components/Host/Header/index.vue'
import HostLayout from '~/components/Host/Layout/index.vue'
import SubPages from '~/components/SubPages/index.vue'

// The editorial page: the home page, overview pages and landing pages. A hero
// image and a free layout, no sidebar. An overview page lists its sub-pages
// in the main menu above the blocks.
const props = defineProps<
  NodeEditorialFragment & {
    breadcrumb?: BreadcrumbFragment[]
    subPages?: { label: string; url: string; description?: string | null }[]
  }
>()

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
    subPages: {
      type: 'checkbox',
      label: {
        en: 'Show sub-pages',
        de: 'Unterseiten anzeigen',
        fr: 'Afficher les sous-pages',
      },
      default: true,
    },
  },
})
</script>
