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
          variant="image"
          :is-editing
          :breadcrumb
        >
          <template #eyebrow>{{ $texts('office.label', 'Office') }}</template>
        </HostHeader>
      </template>
      <Facts v-if="address || phone || email || hours?.length" class="mb-10">
        <FactsItem v-if="address" :label="$texts('office.address', 'Address')">
          <p class="whitespace-pre-line">{{ address }}</p>
        </FactsItem>
        <FactsItem
          v-if="phone || email"
          :label="$texts('contact.label', 'Contact')"
        >
          <OfficeDetails v-bind="props" compact />
        </FactsItem>
        <FactsItem
          v-if="hours?.length"
          :label="$texts('office.opening_hours', 'Opening hours')"
          class="md:col-span-2"
        >
          <OfficeHours :hours />
        </FactsItem>
      </Facts>
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
import { BlokkliField, BlokkliProvider } from '#components'
import type {
  BreadcrumbFragment,
  NodeOfficeFragment,
} from '#graphql-operations'
import Facts from '~/components/Facts/index.vue'
import FactsItem from '~/components/Facts/Item/index.vue'
import HostHeader from '~/components/Host/Header/index.vue'
import HostLayout from '~/components/Host/Layout/index.vue'
import OfficeDetails from '~/components/Office/Details/index.vue'
import OfficeHours from '~/components/Office/Hours/index.vue'

// An office: its address, contact and opening hours are the facts after the
// header.
const props = defineProps<
  NodeOfficeFragment & { breadcrumb?: BreadcrumbFragment[] }
>()
</script>
