<template>
  <div
    class="grid items-start gap-grid md:grid-cols-[5fr_7fr]"
    data-test="story-scene"
    data-test-layout="tabs"
  >
    <!--
      Each section's title (a picture's caption) is a tab, and the rest of the
      section is beside the list. While editing, only the rest is the section's
      block: the list holds every section's title, so it's the story's, and
      pressing a title selects the story. The band's pages show the sections.
    -->
    <div
      ref="tablist"
      role="tablist"
      aria-orientation="vertical"
      :aria-label="label || undefined"
      class="flex flex-col border-l border-line"
    >
      <button
        v-for="tab in tabs"
        :id="tabId(tab.uuid)"
        :key="tab.uuid"
        type="button"
        role="tab"
        :aria-selected="tab.uuid === activeUuid"
        :aria-controls="panelId"
        :tabindex="tab.uuid === activeUuid ? 0 : -1"
        class="-ml-px border-l-4 px-5 py-3 text-left text-h3"
        :class="
          tab.uuid === activeUuid
            ? 'border-primary text-primary'
            : 'border-transparent text-muted hover:text-ink'
        "
        data-test="story-tab"
        :data-test-uuid="tab.uuid"
        :data-test-active="tab.uuid === activeUuid"
        @click="selectedUuid = tab.uuid"
        @keydown="onKeydown"
      >
        {{ getLabel(tab) }}
      </button>
    </div>

    <!--
      The panel is around the section's block, not the block's element: the
      editor takes the id of a block's element for its anchor.
    -->
    <div
      v-if="active"
      :id="panelId"
      role="tabpanel"
      :aria-labelledby="tabId(active.uuid)"
    >
      <BlokkliItem :key="active.uuid" v-bind="active">
        <div data-test="story-section" :data-test-uuid="active.uuid">
          <template v-if="active.bundle === 'teaser'">
            <MediaImage
              v-if="active.props.image"
              v-bind="active.props.image"
              img-class="aspect-[3/2] w-full object-cover"
            />
            <p
              v-if="active.props.lead || isEditing"
              v-blokkli-editable:field_lead
              :data-placeholder="$texts('placeholder.text', 'Text')"
              class="editable-placeholder mt-3 text-lead"
            >
              {{ active.props.lead }}
            </p>
          </template>
          <template v-else-if="active.bundle === 'image'">
            <MediaImage
              v-if="active.props.media"
              v-bind="active.props.media"
              img-class="aspect-[3/2] w-full object-cover"
            />
          </template>
          <BlokkliField
            v-else
            name="field_paragraphs"
            :list="active.props.paragraphs"
            edit-class="min-h-16"
          />
        </div>
      </BlokkliItem>
    </div>
    <!--
      A section without a tab, while it's shown: its own type, nested in the
      story, as the field renders its blocks.
    -->
    <BlokkliItem
      v-else-if="otherShown"
      :key="otherShown.uuid"
      v-bind="otherShown"
    />
  </div>
</template>

<script lang="ts" setup>
import type { FieldListItemTyped } from '#blokkli-build/generated-types'

type TabItem = Extract<
  FieldListItemTyped,
  { bundle: 'teaser' | 'accordion' | 'image' }
>

// Every section's title in a list, the active section beside it, as a project's
// scrollytelling block does it. A picture's caption is its title. Only sections
// with one get a tab: the layout leaves the others out. On the site, the
// visitor picks the tab; while editing, the field shows one section at a time.
const props = defineProps<{
  items: FieldListItemTyped[]
  shownIndex: number | null
  /** The story's title, which names the list. */
  label?: string | null
}>()

const isEditing = import.meta.blokkliEditing

const id = useId()
const panelId = `${id}-panel`

function tabId(uuid: string): string {
  return `${id}-${uuid}`
}

function getLabel(item: TabItem): string {
  return (item.bundle === 'image' ? item.props.caption : item.props.title) ?? ''
}

const tabs = computed(() =>
  props.items.filter(
    (item): item is TabItem =>
      (item.bundle === 'teaser' ||
        item.bundle === 'accordion' ||
        item.bundle === 'image') &&
      !!getLabel(item),
  ),
)

const shown = computed(() =>
  props.shownIndex === null ? null : (props.items[props.shownIndex] ?? null),
)

const selectedUuid = ref<string | null>(null)

const active = computed<TabItem | null>(() => {
  if (shown.value) {
    const uuid = shown.value.uuid
    return tabs.value.find((tab) => tab.uuid === uuid) ?? null
  }
  return (
    tabs.value.find((tab) => tab.uuid === selectedUuid.value) ??
    tabs.value[0] ??
    null
  )
})

const activeUuid = computed(() => active.value?.uuid ?? null)

const otherShown = computed(() =>
  shown.value && !active.value ? shown.value : null,
)

const tablist = useTemplateRef('tablist')

// The keys of a vertical tab list: the arrows go to the previous or next tab,
// Home and End to the first or last one, which becomes active.
const KEYS: Record<string, (index: number, last: number) => number> = {
  ArrowDown: (index, last) => (index >= last ? 0 : index + 1),
  ArrowUp: (index, last) => (index <= 0 ? last : index - 1),
  Home: () => 0,
  End: (_, last) => last,
}

function onKeydown(e: KeyboardEvent) {
  const move = KEYS[e.key]
  if (!move) {
    return
  }
  e.preventDefault()
  const index = move(
    tabs.value.findIndex((tab) => tab.uuid === activeUuid.value),
    tabs.value.length - 1,
  )
  const tab = tabs.value[index]
  if (tab) {
    selectedUuid.value = tab.uuid
    tablist.value?.querySelectorAll<HTMLElement>('[role="tab"]')[index]?.focus()
  }
}
</script>
