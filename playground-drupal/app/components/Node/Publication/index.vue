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
          variant="plain"
          :is-editing
          :breadcrumb
        >
          <template #eyebrow>{{ typeLabel(publicationType) }}</template>
          <template v-if="period" #meta>
            {{
              $texts('publication.period', 'Published from @start to @end', {
                '@start': period.startDay,
                '@end': period.endDay,
              })
            }}
          </template>
        </HostHeader>
      </template>
      <BlokkliField name="field_paragraphs" :list="paragraphs" />
    </HostLayout>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { BlokkliField, BlokkliProvider } from '#components'
import type {
  BreadcrumbFragment,
  NodePublicationFragment,
} from '#graphql-operations'
import HostHeader from '~/components/Host/Header/index.vue'
import HostLayout from '~/components/Host/Layout/index.vue'
import { usePublicationType } from '~/composables/usePublicationType'

// An official publication: its type above the title, its period below. The
// details (e.g. the documents) are blocks.
const props = defineProps<
  NodePublicationFragment & { breadcrumb?: BreadcrumbFragment[] }
>()

const typeLabel = usePublicationType()
</script>
