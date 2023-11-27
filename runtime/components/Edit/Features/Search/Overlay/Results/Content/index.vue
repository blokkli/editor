<template>
  <div v-show="visible">
    <div v-if="visible && isLoading" class="pb-search-loading">
      <Icon name="spinner" />
    </div>
    <div :class="{ 'pb-search-is-loading': isLoading }">
      <button
        v-for="(item, i) in items"
        :class="{ 'pb-is-active': i === index }"
        @click.stop="clickItem"
        @mouseenter="index = i"
        ref="listItems"
      >
        <div class="pb-search-item-icon">
          <img v-if="item.imageUrl" :src="item.imageUrl" />
          <ParagraphIcon v-else :bundle="item.targetBundles[0]" />
        </div>
        <div class="pb-search-item-content">
          <h2 class="pb-highlight" v-html="item.title" />
          <div class="pb-search-item-context" v-html="item.context" />
          <div class="pb-search-item-text pb-highlight" v-html="item.text" />
        </div>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ParagraphIcon, Icon } from '#pb/components'
import { modulo } from '#pb/helpers'
import { PbSearchContentItem } from '#pb/types'

const listItems = ref<HTMLLIElement[]>([])

const props = defineProps<{
  visible: boolean
  search: string
  tab: string
}>()

const itemsSearchTerm = ref('')
const isLoading = ref(true)

const emit = defineEmits(['close'])

const { allTypes, eventBus, adapter } = useParagraphsBuilderStore()

const items = ref<PbSearchContentItem[]>([])
let timeout: any = null

const typeLabelMap = computed(() => {
  return allTypes.value.reduce<Record<string, string>>((acc, v) => {
    if (v.id && v.label) {
      acc[v.id] = v.label
    }
    return acc
  }, {})
})

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
    adapter
      .getContentSearchResults(props.tab, props.search)
      .then((newItems) => {
        items.value = newItems
        itemsSearchTerm.value = searchTerm
        isLoading.value = false
      })
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
