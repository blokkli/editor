<template>
  <div :class="[spacing, { 'container-wide': hasContainer }]">
    <div
      class="grid gap-x-grid gap-y-6 bg-surface p-6 md:p-10 lg:grid-cols-12 lg:items-center"
    >
      <div
        class="flex flex-col gap-3"
        :class="isList ? 'lg:col-span-7' : 'lg:col-span-8'"
      >
        <p
          v-if="tagline || isEditing"
          v-blokkli-editable:field_tagline
          :data-placeholder="$texts('placeholder.tagline', 'Tagline')"
          class="editable-placeholder text-label text-primary uppercase"
        >
          {{ tagline }}
        </p>
        <h2
          v-blokkli-editable:field_title
          class="font-serif text-h2 text-balance"
        >
          {{ title }}
        </h2>
        <p v-if="date" class="font-semibold">
          <time :datetime="options.date">{{ date }}</time>
        </p>
        <p
          v-if="lead || isEditing"
          v-blokkli-editable:field_lead
          :data-placeholder="$texts('placeholder.text', 'Text')"
          class="editable-placeholder max-w-content"
        >
          {{ lead }}
        </p>
      </div>
      <BlokkliField
        name="field_links"
        :list="links"
        tag="ul"
        :class="
          isList
            ? 'border-t border-ink lg:col-span-5'
            : 'lg:col-span-4 lg:justify-self-end'
        "
        edit-class="min-h-12 min-w-40"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ParagraphCallToActionFragment } from '#graphql-operations'

// A box with a tagline, a title, a date, a text and up to four links. One link
// is a button next to the text, several are a list (Link/InList.vue). The date
// is an option: a time of day without a time zone, the town's.
defineProps<ParagraphCallToActionFragment>()

const block = defineBlokkli({
  bundle: 'call_to_action',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    date: {
      type: 'datetime-local',
      label: { en: 'Date', de: 'Datum', fr: 'Date' },
      description: {
        en: 'Shown under the title, e.g. the date of an assembly.',
        de: 'Wird unter dem Titel angezeigt, z. B. das Datum einer Versammlung.',
        fr: 'Affichée sous le titre, p. ex. la date d’une assemblée.',
      },
    },
  },
  propsFieldMapping: {
    tagline: { type: 'editable', name: 'field_tagline' },
    title: { type: 'editable', name: 'field_title' },
    lead: { type: 'editable', name: 'field_lead' },
    links: { type: 'field', name: 'field_links' },
  },
  editor: {
    // Added with the title's default text, which is then edited in place.
    addBehaviour: 'editable:field_title',
    icon: 'bk_mdi_ads_click',
    editTitle: (el) => el.querySelector('h2')?.textContent,
  },
})
const { uuid, siblings, options } = block
const spacing = useBlockSpacing(block)
const hasContainer = useHasContainer(block)

const isEditing = import.meta.blokkliEditing

// Formatted as it is, whatever the browser's time zone.
const language = useLanguage()
const date = computed(() =>
  options.value.date
    ? new Intl.DateTimeFormat(LOCALES[language.value], {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      }).format(new Date(`${options.value.date}Z`))
    : '',
)

// The links prop isn't updated while editing: queryBlocks reads the box's
// links from the editor's state then.
const { queryBlocks } = useBlokkliHelper()
const links = queryBlocks(['link'], () =>
  siblings.value.filter((item) => item.uuid === uuid),
)
const isList = computed(() => links.value.length > 1)
</script>
