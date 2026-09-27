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
        >
          <template v-if="changedDate?.first?.day" #meta>
            {{
              $texts('page.updated', 'Updated on @date', {
                '@date': changedDate.first.day,
              })
            }}
          </template>
        </HostHeader>
      </template>
      <BlokkliField
        name="field_paragraphs"
        :list="paragraphs"
        :allowed-fragments="['upcoming_events', 'latest_news']"
        class="flow"
      />
      <template #aside>
        <BlokkliField
          name="field_aside"
          :list="aside"
          field-list-type="sidebar"
          non-empty-class="has-aside"
          edit-class="min-h-24"
          class="container-content flex flex-col gap-10"
        />
      </template>
    </HostLayout>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { defineBlokkliProvider } from '#imports'
import { BlokkliField, BlokkliProvider } from '#components'
import type { NodePageFragment } from '#graphql-operations'
import HostHeader from '~/components/Host/Header/index.vue'
import HostLayout from '~/components/Host/Layout/index.vue'

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
