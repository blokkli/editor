<template>
  <div v-show="visible">
    <div v-if="visible && isLoading" class="bk-search-loading">
      <Icon name="spinner" />
    </div>
    <div :class="{ 'bk-search-is-loading': isLoading }">
      <button
        v-for="(item, i) in items"
        :key="item.id"
        ref="listItems"
        :class="{ 'bk-is-active': i === index }"
        @click.stop="clickItem"
        @mouseenter="index = i"
      >
        <div class="bk-search-item-icon">
          <img v-if="item.imageUrl" :src="item.imageUrl" />
          <ItemIcon v-else :bundle="item.targetBundles[0]" />
        </div>
        <div class="bk-search-item-content">
          <h2 class="bk-highlight" v-html="item.title" />
          <div class="bk-search-item-context" v-html="item.context" />
          <div class="bk-search-item-text bk-highlight" v-html="item.text" />
        </div>
      </button>
    </div>
    <div
      v-if="!isLoading && !items.length && search"
      class="bk-search-no-results"
    >
      <Icon name="sad" />
      <span>{{ text('searchBoxNoResultsFound') }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ItemIcon, Icon } from '#blokkli/components'
import { modulo } from '#blokkli/helpers'
import type { BlokkliSearchContentItem } from '#blokkli/types'

const listItems = ref<HTMLLIElement[]>([])

const props = defineProps<{
  visible: boolean
  search: string
  tab: string
}>()

const itemsSearchTerm = ref('')
const isLoading = ref(true)

const emit = defineEmits(['close'])

const { eventBus, adapter, text } = useBlokkli()

const items = ref<BlokkliSearchContentItem[]>([])
let timeout: any = null

const doSearch = () => {
  isLoading.value = false
  const searchTerm = props.search
  clearTimeout(timeout)
  if (!searchTerm) {
    items.value = []
    return
  }
  if (!props.visible) {
    return
  }
  if (searchTerm === itemsSearchTerm.value) {
    return
  }
  isLoading.value = true
  timeout = setTimeout(() => {
    // This component can only ever be rendered if this adapter method exists,
    // so we can safely assume it's there.
    adapter.getContentSearchResults!(props.tab, props.search).then(
      (newItems) => {
        items.value = newItems
        itemsSearchTerm.value = searchTerm
        isLoading.value = false
      },
    )
  }, 200)
}

const index = ref(0)

const prev = () => setIndex(index.value - 1)
const next = () => setIndex(index.value + 1)
const select = () => clickItem()

const isActive = () => props.visible

defineExpose({ prev, next, select, isActive })

const setIndex = (newIndex: number) => {
  index.value = modulo(newIndex, items.value.length)
  scrollItemIntoView()
}

const clickItem = () => {
  const item = items.value[index.value]
  if (!item) {
    return
  }

  eventBus.emit('search:selectContentItem', item)
  emit('close')
}

const scrollItemIntoView = () => {
  const item = listItems.value[index.value]
  if (item) {
    item.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
}

watch(items, () => {
  index.value = 0
  scrollItemIntoView()
})

watch(() => props.search, doSearch)
watch(() => props.tab, doSearch)
watch(() => props.visible, doSearch)

onMounted(() => {
  doSearch()
})
</script>
