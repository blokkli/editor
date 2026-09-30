<template>
  <BlokkliProvider
    v-slot="{ entity, isEditing }"
    v-bind="blokkliProps"
    :entity="props"
  >
    <HostLayout :class="{ 'gap-section lg:gap-24': frontPage }">
      <template #header>
        <slot name="header" :entity :is-editing :options :breadcrumb>
          <HostHeader
            :title="entity.title"
            :lead="entity.lead"
            :image="entity.hero"
            :variant="options.header"
            :is-editing
            :breadcrumb
          />
        </slot>
      </template>
      <SubPages
        v-if="options.subPages && subPages?.length"
        :items="subPages"
        class="mb-10"
      />
      <BlokkliField
        name="field_paragraphs"
        :list="paragraphs"
        :allowed-fragments="frontPage ? ['today', 'quick_links'] : []"
        :class="{ 'flex flex-col gap-section lg:gap-24 *:mt-0': frontPage }"
      />
      <slot />
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
// in the main menu above the blocks. The front page (pages/index.vue)
// has its own header, more space between the blocks, and the only fragments:
// what's on today and the frequently searched links. A frontend route
// (FrontendRoute) puts its own part after the blocks.
const props = defineProps<
  NodeEditorialFragment & {
    breadcrumb?: BreadcrumbFragment[]
    subPages?: { label: string; url: string; description?: string | null }[]
    frontPage?: boolean
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
