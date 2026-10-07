<template>
  <section :aria-label="$texts('today.label', 'Today')" class="container-wide">
    <div
      class="grid divide-y divide-line border-y border-t-ink border-b-line md:grid-cols-3 md:divide-x md:divide-y-0"
    >
      <div
        v-for="item in items"
        :key="item.label"
        class="flex flex-col gap-1 py-5 md:px-6 md:first:pl-0"
      >
        <h2 class="text-label text-muted uppercase">{{ item.label }}</h2>
        <p class="flex items-center gap-2 font-semibold">
          <span v-if="item.open" class="size-2.5 shrink-0 bg-success" />
          {{ item.value }}
        </p>
        <SiteLink
          v-if="item.link"
          :to="item.link.to"
          class="self-start text-small text-primary underline hover:text-primary-dark"
        >
          {{ item.link.label }}
        </SiteLink>
        <p v-else-if="item.note" class="text-small text-muted">
          {{ item.note }}
        </p>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
// What's on today, for the home page only: whether the site config page's
// office is open today, the next household waste collection, and the config
// page's event (e.g. the next assembly).
// Before the await: the editor needs the definition during setup.
defineBlokkliFragment({
  name: 'today',
  label: 'Today',
  description:
    "An office's hours today, the next collection and an event, from the site config page.",
  editor: {
    icon: 'bk_mdi_today',
    previewWidth: 800,
  },
})

// Household waste is collected every Tuesday (office_hours' numbering, 0 is
// Sunday), as the collection days page says.
const COLLECTION_DAY = 2

const { $texts } = useEasyTexts()
const language = useLanguage()

const { data } = await useAsyncGraphqlQuery('today')

// Today in the town's time zone, as a date at midnight UTC: getUTCDay() is
// its weekday.
function today(): Date {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
  })
    .format(new Date())
    .split('-')
    .map(Number)
  return new Date(Date.UTC(year!, month! - 1, day))
}

// A day with its weekday, e.g. "Dienstag, 6. Oktober" or "mardi 6 octobre".
function formatDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALES[language.value], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(date)
}

type Item = {
  label: string
  value: string
  open?: boolean
  note?: string
  link?: { label: string; to: string }
}

const officeItem = computed<Item | null>(() => {
  const office = data.value?.data.siteConfig?.office
  if (!office?.title) {
    return null
  }
  const weekday = today().getUTCDay()
  const hours = hoursOfDay(office.hours, weekday)
  if (hours.length) {
    return {
      label: office.title,
      value: $texts('today.open', 'Open today'),
      open: true,
      note: new Intl.ListFormat(LOCALES[language.value]).format(hours),
    }
  }
  // The next day it's open, within a week.
  const next = [1, 2, 3, 4, 5, 6]
    .map((offset) => (weekday + offset) % 7)
    .find((day) => hoursOfDay(office.hours, day).length)
  return {
    label: office.title,
    value: $texts('today.closed', 'Closed today'),
    note:
      next === undefined
        ? undefined
        : $texts('today.open_again', 'Open again on @day', {
            '@day': weekdayName(next, language.value),
          }),
  }
})

const collectionItem = computed<Item>(() => {
  const date = today()
  date.setUTCDate(
    date.getUTCDate() + ((COLLECTION_DAY - date.getUTCDay() + 7) % 7),
  )
  return {
    label: $texts('today.collection', 'Next collection'),
    value: `${$texts('today.household_waste', 'Household waste')} · ${formatDay(date, 'UTC')}`,
    note: $texts('today.collection_note', 'Out on the street by 7:00'),
  }
})

const eventItem = computed<Item | null>(() => {
  const event = data.value?.data.siteConfig?.event
  if (!event?.title || !event.date?.start || !event.url?.path) {
    return null
  }
  return {
    label: event.title,
    value: formatDay(new Date(event.date.start), 'Europe/Zurich'),
    link: {
      label: $texts('today.event_link', 'Details'),
      to: event.url.path,
    },
  }
})

const items = computed(() =>
  [officeItem.value, collectionItem.value, eventItem.value].filter(
    (item): item is Item => !!item,
  ),
)
</script>
