<template>
  <div
    class="bk-search-box"
    @keydown="onKeyDown"
    @wheel.stop.passive
    @mousedown.stop
    @click.stop
  >
    <div class="bk-search-input">
      <Icon name="search" />
      <input
        id="pb_search_input"
        ref="input"
        v-model="search"
        type="text"
        :placeholder="$t('searchBoxPlaceholder', 'Enter search term')"
        autocomplete="off"
        spellcheck="false"
        required
      />
      <button @click="$emit('close')">
        <Icon name="close" />
      </button>
    </div>

    <ul class="bk-search-tabs">
      <li
        v-for="(item, i) in tabItems"
        :key="'tab_' + item.key"
        :class="{ 'bk-is-active': tabIndex === i }"
      >
        <button
          :disabled="!item.enabled"
          @click="item.enabled ? (tabIndex = i) : undefined"
        >
          {{ item.label }}
        </button>
      </li>
    </ul>

    <div class="bk-search-results">
      <div ref="resultsEl" class="bk-search-list">
        <template v-for="item in tabItems" :key="item.key">
          <ResultsPage
            v-if="item.key === 'on_this_page'"
            ref="searchComponents"
            :visible="tab === item.key"
            :search="searchCleaned"
            :search-box-visible="visible"
            :tab="item.key"
            @close="$emit('close')"
          />
          <ResultsContent
            v-else-if="item.enabled"
            ref="searchComponents"
            :visible="tab === item.key"
            :search="searchCleaned"
            :tab="item.key"
            @close="$emit('close')"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { watch, ref, computed, useBlokkli, onMounted, nextTick } from '#imports'
import { Icon } from '#blokkli/components'
import { modulo } from '#blokkli/helpers'
import ResultsPage from './Results/Page/index.vue'
import ResultsContent from './Results/Content/index.vue'

const props = defineProps<{
  visible: boolean
}>()

const { adapter, $t, state } = useBlokkli()

const emit = defineEmits(['close'])

type SearchComponent =
  | InstanceType<typeof ResultsContent>
  | InstanceType<typeof ResultsPage>

const searchComponents = ref<SearchComponent[]>([])

const tabsMap = computed(() => {
  return {
    on_this_page: $t('searchBoxOnThisPage', 'On this page'),
    ...(adapter.getContentSearchTabs ? adapter.getContentSearchTabs() : {}),
  }
})

const tabItems = computed(() => {
  return Object.entries(tabsMap.value).map(([key, label]) => {
    return {
      key,
      label,
      enabled: key === 'on_this_page' || state.editMode.value === 'editing',
    }
  })
})

const tabs = computed(() => Object.keys(tabsMap.value) as string[])
const tabIndex = ref(0)
const tab = computed<string>(() => tabs.value[tabIndex.value])

const search = ref('')
const input = ref<HTMLInputElement | null>(null)
const resultsEl = ref<HTMLDivElement | null>(null)

watch(search, () => {
  const component = getResultsComponent()
  if (component) {
    component.goToFirst()
    nextTick(() => {
      if (resultsEl.value) {
        resultsEl.value.scrollTop = 0
      }
    })
  }
})

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
    tabIndex.value = modulo(tabIndex.value - 1, tabs.value.length)
    stop()
  } else if (e.code === 'ArrowRight') {
    tabIndex.value = modulo(tabIndex.value + 1, tabs.value.length)
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
