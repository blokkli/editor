<template>
  <BlokkliProvider
    v-slot="{ entity, isEditing }"
    v-bind="blokkliProps"
    :entity="props"
  >
    <HostLayout sidebar aside-first>
      <template #header>
        <HostHeader
          :title="entity.title"
          :lead="entity.lead"
          variant="plain"
          :is-editing
          :breadcrumb
        >
          <template #eyebrow>{{ $texts('office.label', 'Office') }}</template>
        </HostHeader>
      </template>
      <BlokkliField
        name="field_paragraphs"
        :list="paragraphs"
        :allowed-fragments="['upcoming_events', 'latest_news']"
        class="flow"
      />
      <template #aside>
        <div class="container-content flex flex-col gap-4">
          <h2
            class="border-b border-ink pb-2.5 text-label text-muted uppercase"
          >
            {{ $texts('contact.label', 'Contact') }}
          </h2>
          <OfficeDetails v-bind="props" />
        </div>
      </template>
    </HostLayout>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { BlokkliField, BlokkliProvider } from '#components'
import type {
  BreadcrumbFragment,
  NodeOfficeFragment,
} from '#graphql-operations'
import HostHeader from '~/components/Host/Header/index.vue'
import HostLayout from '~/components/Host/Layout/index.vue'
import OfficeDetails from '~/components/Office/Details/index.vue'

const props = defineProps<
  NodeOfficeFragment & { breadcrumb?: BreadcrumbFragment[] }
>()
</script>
