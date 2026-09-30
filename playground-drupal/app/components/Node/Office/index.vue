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
          :image="location?.image"
          static-image
          variant="image"
          :is-editing
          :breadcrumb
        >
          <template #eyebrow>{{ $texts('office.label', 'Office') }}</template>
        </HostHeader>
      </template>
      <Facts v-if="location || phone || email || hours?.length" class="mb-10">
        <FactsItem v-if="location" :label="$texts('office.address', 'Address')">
          <p class="whitespace-pre-line">
            {{ location.label }}<br />{{ location.address }}
          </p>
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
        :allowed-fragments="['office_pages']"
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
// header. The address and the header's photo are its location's, a building
// that other offices can be in too (a taxonomy term, edited in Drupal). The
// fragment office_pages lists the detail pages it's responsible for.
const props = defineProps<
  NodeOfficeFragment & { breadcrumb?: BreadcrumbFragment[] }
>()
</script>
