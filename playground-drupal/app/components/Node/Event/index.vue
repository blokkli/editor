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
          <template #eyebrow>{{ categoryLabel }}</template>
          <template v-if="organiser" #meta>
            {{
              $texts('event.organised_by', 'Organised by @name', {
                '@name': organiser,
              })
            }}
          </template>
          <template v-if="registration?.uri?.path" #actions>
            <a :href="registration.uri.path" class="button">
              {{ $texts('event.register', 'Register') }}
            </a>
          </template>
        </HostHeader>
      </template>
      <Facts v-if="facts.length" class="mb-10">
        <FactsItem
          v-for="fact in facts"
          :key="fact.label"
          :label="fact.label"
          class="font-serif text-h2"
          :class="{ 'md:col-span-2': fact.wide }"
        >
          <time v-if="fact.datetime" :datetime="fact.datetime">
            {{ fact.value }}
          </time>
          <template v-else>{{ fact.value }}</template>
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
import { computed, useEasyTexts } from '#imports'
import { BlokkliField, BlokkliProvider } from '#components'
import type { BreadcrumbFragment, NodeEventFragment } from '#graphql-operations'
import Facts from '~/components/Facts/index.vue'
import FactsItem from '~/components/Facts/Item/index.vue'
import HostHeader from '~/components/Host/Header/index.vue'
import HostLayout from '~/components/Host/Layout/index.vue'

// An event: its date, time and place are the facts after the header, large.
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

function withWeekday(weekday: string, day: string): string {
  return $texts('event.weekday_date', '@weekday, @date', {
    '@weekday': weekday,
    '@date': day,
  })
}

// One day: its date and the time. Several days: the start and the end, each
// over two columns.
const facts = computed(() => {
  const date = props.date
  const facts: {
    label: string
    value: string
    datetime?: string
    wide?: boolean
  }[] = []
  if (date && date.startDay === date.endDay) {
    facts.push(
      {
        label: $texts('event.date', 'Date'),
        value: withWeekday(date.startWeekday, date.startDay),
        datetime: date.start,
      },
      {
        label: $texts('event.time', 'Time'),
        value: `${date.startTime}–${date.endTime}`,
      },
    )
  } else if (date) {
    facts.push(
      {
        label: $texts('event.start', 'Start'),
        value: `${withWeekday(date.startWeekday, date.startDay)}, ${date.startTime}`,
        datetime: date.start,
        wide: true,
      },
      {
        label: $texts('event.end', 'End'),
        value: `${withWeekday(date.endWeekday, date.endDay)}, ${date.endTime}`,
        datetime: date.end,
        wide: true,
      },
    )
  }
  if (props.place) {
    facts.push({ label: $texts('event.place', 'Place'), value: props.place })
  }
  if (props.price) {
    facts.push({ label: $texts('event.price', 'Price'), value: props.price })
  }
  return facts
})
</script>
