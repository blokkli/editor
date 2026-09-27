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
          :image="entity.hero"
          variant="image"
          :is-editing
          :breadcrumb
        >
          <template #eyebrow>{{ categoryLabel }}</template>
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
            {{ $texts('event.details', 'Details') }}
          </h2>
          <dl class="flex flex-col gap-4">
            <div v-if="dateRange">
              <dt class="text-small font-semibold text-muted">
                {{ $texts('event.date', 'Date') }}
              </dt>
              <dd>
                <time :datetime="date?.start">{{ dateRange }}</time>
              </dd>
            </div>
            <div v-if="place">
              <dt class="text-small font-semibold text-muted">
                {{ $texts('event.place', 'Place') }}
              </dt>
              <dd>{{ place }}</dd>
            </div>
            <div v-if="organiser">
              <dt class="text-small font-semibold text-muted">
                {{ $texts('event.organiser', 'Organiser') }}
              </dt>
              <dd>{{ organiser }}</dd>
            </div>
            <div v-if="price">
              <dt class="text-small font-semibold text-muted">
                {{ $texts('event.price', 'Price') }}
              </dt>
              <dd>{{ price }}</dd>
            </div>
          </dl>
          <a
            v-if="registration?.uri?.path"
            :href="registration.uri.path"
            class="button mt-2"
          >
            {{ $texts('event.register', 'Register') }}
          </a>
        </div>
      </template>
    </HostLayout>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { computed, useEasyTexts } from '#imports'
import { BlokkliField, BlokkliProvider } from '#components'
import type { BreadcrumbFragment, NodeEventFragment } from '#graphql-operations'
import HostHeader from '~/components/Host/Header/index.vue'
import HostLayout from '~/components/Host/Layout/index.vue'
import { formatDateRange } from '~/helpers/date'

const props = defineProps<
  NodeEventFragment & { breadcrumb?: BreadcrumbFragment[] }
>()

const { $texts } = useEasyTexts()

// The allowed values of field_category: the schema only has the key. One
// literal call per value, so that the keys can be extracted.
const categoryLabel = computed(() => {
  switch (props.category) {
    case 'culture':
      return $texts('event.category_culture', 'Culture')
    case 'sport':
      return $texts('event.category_sport', 'Sport')
    case 'family':
      return $texts('event.category_family', 'Family')
    case 'market':
      return $texts('event.category_market', 'Market')
    case 'politics':
      return $texts('event.category_politics', 'Politics')
  }
  return $texts('event.event', 'Event')
})

const dateRange = computed(() =>
  props.date ? formatDateRange(props.date) : '',
)
</script>
