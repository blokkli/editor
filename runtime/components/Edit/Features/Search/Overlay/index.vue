<template>
  <div
    class="pb-search-box"
    @keydown="onKeyDown"
    @wheel.stop
    @mousedown.stop
    @click.stop
  >
    <div class="pb-search-input">
      <Icon name="search" />
      <input
        v-model="search"
        type="text"
        id="pb_search_input"
        placeholder="Suchbegriff eingeben"
        ref="input"
        autocomplete="off"
        spellcheck="false"
        required
      />
    </div>

    <ul class="pb-search-tabs">
      <li
        v-for="(item, i) in tabItems"
        :class="{ 'pb-is-active': tabIndex === i }"
      >
        <button @click="tabIndex = i">{{ item.label }}</button>
      </li>
    </ul>

    <div class="pb-search-results" ref="resultsEl">
      <div class="pb-search-list">
        <template v-for="item in tabItems">
          <ResultsPage
            v-if="item.key === 'on_this_page'"
            :visible="tab === item.key"
            :search="searchCleaned"
            :search-box-visible="visible"
            :tab="item.key"
            @close="$emit('close')"
            ref="searchComponents"
          />
          <ResultsContent
            v-else
            :visible="tab === item.key"
            :search="searchCleaned"
            :tab="item.key"
            @close="$emit('close')"
            ref="searchComponents"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#blokkli/components'
import { modulo } from '#blokkli/helpers'
import ResultsPage from './Results/Page/index.vue'
import ResultsContent from './Results/Content/index.vue'

const { adapter } = useBlokkli()

const emit = defineEmits(['close'])

type SearchComponent =
  | InstanceType<typeof ResultsContent>
  | InstanceType<typeof ResultsPage>

const searchComponents = ref<SearchComponent[]>([])

const tabsMap: Record<string, string> = {
  on_this_page: 'Auf dieser Seite',
  ...adapter.getContentSearchTabs(),
}

const tabItems = computed(() => {
  return Object.entries(tabsMap).map(([key, label]) => {
    return { key, label }
  })
})

const tabs = Object.keys(tabsMap) as string[]
const tabIndex = ref(0)
const tab = computed<string>(() => tabs[tabIndex.value])

const search = ref('')
const input = ref<HTMLInputElement | null>(null)
const resultsEl = ref<HTMLDivElement | null>(null)

const searchCleaned = computed(() =>
  search.value
    .trim()
    .toLowerCase()
    .split(' ')
    .map((v) => v.trim())
    .filter(Boolean)
    .join(' '),
)

const getResultsComponent = (): SearchComponent | undefined => {
  return searchComponents.value.find((v) => v.isActive())
}

const props = defineProps<{
  visible: boolean
}>()

const focusInput = () => {
  if (input.value) {
    input.value.focus()
    input.value.select()
  }
}

onMounted(() => {
  focusInput()
})

defineExpose({ focusInput })

const onKeyDown = (e: KeyboardEvent) => {
  const resultsComponent = getResultsComponent()
  if (!resultsComponent) {
    return
  }
  const stop = () => {
    e.preventDefault()
    e.stopPropagation()
  }
  if (e.code === 'Tab') {
    e.shiftKey ? resultsComponent.prev() : resultsComponent.next()
    stop()
  } else if (e.code === 'ArrowDown') {
    resultsComponent.next()
    stop()
  } else if (e.code === 'ArrowUp') {
    resultsComponent.prev()
    stop()
  } else if (e.code === 'Enter') {
    resultsComponent.select()
    emit('close')
    stop()
  } else if (e.code === 'ArrowLeft') {
    tabIndex.value = modulo(tabIndex.value - 1, tabs.length)
    stop()
  } else if (e.code === 'ArrowRight') {
    tabIndex.value = modulo(tabIndex.value + 1, tabs.length)
    stop()
  } else if (e.code === 'Escape') {
    emit('close')
    stop()
  }
}

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      if (input.value) {
        input.value.focus()
      }
    }
  },
)
</script>
