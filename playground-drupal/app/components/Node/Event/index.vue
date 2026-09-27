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
            <dt class="text-sm font-semibold text-stone-600">Date</dt>
            <dd class="text-lg">
              <time :datetime="date?.start">{{ dateRange }}</time>
            </dd>
          </div>
          <div v-if="place">
            <dt class="text-sm font-semibold text-stone-600">Place</dt>
            <dd>{{ place }}</dd>
          </div>
          <div v-if="organiser">
            <dt class="text-sm font-semibold text-stone-600">Organiser</dt>
            <dd>{{ organiser }}</dd>
          </div>
          <div v-if="price">
            <dt class="text-sm font-semibold text-stone-600">Price</dt>
            <dd>{{ price }}</dd>
          </div>
          <div v-if="registration?.uri?.path">
            <dt class="text-sm font-semibold text-stone-600">Registration</dt>
            <dd>
              <a :href="registration.uri.path" class="underline">Register</a>
            </dd>
          </div>
        </dl>
      </div>
      <BlokkliField
        name="field_paragraphs"
        :list="paragraphs"
        class="flow mt-10"
      />
    </article>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { BlokkliField, BlokkliProvider } from '#components'
import type { NodeEventFragment } from '#graphql-operations'
import HostHeader from '~/components/Host/Header/index.vue'
import { useLanguage } from '~/composables/useLanguage'
import { formatDateRange } from '~/helpers/date'

const props = defineProps<NodeEventFragment>()

const language = useLanguage()

// The allowed values of field_category. Its labels aren't in the schema.
const CATEGORIES: Record<string, string> = {
  culture: 'Culture',
  sport: 'Sport',
  family: 'Family',
  market: 'Market',
  politics: 'Politics',
}

const categoryLabel = computed(() =>
  props.category ? (CATEGORIES[props.category] ?? 'Event') : 'Event',
)

const dateRange = computed(() =>
  props.date?.start && props.date.end
    ? formatDateRange(props.date.start, props.date.end, language.value)
    : '',
)
</script>
