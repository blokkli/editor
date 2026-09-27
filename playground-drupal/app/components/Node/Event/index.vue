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
        variant="image"
        :is-editing
      >
        <template #meta>
          <p class="mb-2 font-semibold text-stone-600">
            {{ categoryLabel }}
          </p>
        </template>
      </HostHeader>
      <div class="container-content mt-10">
        <dl class="grid gap-4 rounded-sm bg-stone-200 p-6 sm:grid-cols-2">
          <div v-if="dateRange" class="sm:col-span-2">
            <dt class="text-sm font-semibold text-stone-600">
              {{ $texts('event.date', 'Date') }}
            </dt>
            <dd class="text-lg">
              <time :datetime="date?.start">{{ dateRange }}</time>
            </dd>
          </div>
          <div v-if="place">
            <dt class="text-sm font-semibold text-stone-600">
              {{ $texts('event.place', 'Place') }}
            </dt>
            <dd>{{ place }}</dd>
          </div>
          <div v-if="organiser">
            <dt class="text-sm font-semibold text-stone-600">
              {{ $texts('event.organiser', 'Organiser') }}
            </dt>
            <dd>{{ organiser }}</dd>
          </div>
          <div v-if="price">
            <dt class="text-sm font-semibold text-stone-600">
              {{ $texts('event.price', 'Price') }}
            </dt>
            <dd>{{ price }}</dd>
          </div>
          <div v-if="registration?.uri?.path">
            <dt class="text-sm font-semibold text-stone-600">
              {{ $texts('event.registration', 'Registration') }}
            </dt>
            <dd>
              <a :href="registration.uri.path" class="underline">
                {{ $texts('event.register', 'Register') }}
              </a>
            </dd>
          </div>
        </dl>
      </div>
      <BlokkliField
        name="field_paragraphs"
        :list="paragraphs"
        :allowed-fragments="['upcoming_events', 'latest_news']"
        class="flow mt-10"
      />
    </article>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { computed, useEasyTexts } from '#imports'
import { BlokkliField, BlokkliProvider } from '#components'
import type { NodeEventFragment } from '#graphql-operations'
import HostHeader from '~/components/Host/Header/index.vue'
import { formatDateRange } from '~/helpers/date'

const props = defineProps<NodeEventFragment>()

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
