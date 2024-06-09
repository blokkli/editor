<template>
  <div v-show="visible">
    <button
      v-for="(item, i) in visibleItems"
      :key="item.item.uuid"
      ref="listItems"
      class="bk bk-search-item"
      :class="{ 'bk-is-active': i === index }"
      @click.stop="clickItem"
      @mouseenter="index = i"
    >
      <div class="bk-search-item-icon bk-is-icon">
        <ItemIcon :bundle="item.item.itemBundle" />
      </div>
      <div class="bk-search-item-content">
        <Highlight
          class="bk-search-item-title"
          tag="div"
          :text="item.title"
          :regex="regex"
        />
        <div class="bk-search-item-subtitle">
          <Highlight
            v-if="item.context"
            class="bk-search-item-context"
            :text="item.context"
            :regex="regex"
          />
          <Highlight
            class="bk-search-item-text"
            :text="item.text"
            :regex="regex"
          />
        </div>
      </div>
    </button>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, onMounted, watch } from '#imports'
import { ItemIcon, Highlight } from '#blokkli/components'
import { falsy, modulo } from '#blokkli/helpers'
import type { DraggableExistingBlock } from '#blokkli/types'

const listItems = ref<HTMLLIElement[]>([])
const emit = defineEmits(['close'])

const props = defineProps<{
  visible: boolean
  searchBoxVisible: boolean
  search: string
  tab: string
}>()

type SearchItem = {
  item: DraggableExistingBlock
  title: string
  text: string
  context?: string
}

const { eventBus, state, types, dom } = useBlokkli()

const buildForKey = ref('')

const items = ref<SearchItem[]>([])
const index = ref(0)

const prev = () => setIndex(index.value - 1)
const next = () => setIndex(index.value + 1)
const goToFirst = () => setIndex(0)
const select = () => clickItem()
const isActive = () => props.visible

defineExpose({ prev, next, select, isActive, goToFirst })

const words = computed(() =>
  props.search
    .toLowerCase()
    .trim()
    .split(' ')
    .map((v) => v.trim())
    .filter(Boolean),
)

const regex = computed(() => {
  if (!words.value.length) {
    return
  }
  // Join all words into a regex.
  const pattern = words.value
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')

  return new RegExp(pattern, 'gi')
})

const setIndex = (newIndex: number) => {
  index.value = modulo(newIndex, visibleItems.value.length)
  scrollItemIntoView()
}

const clickItem = () => {
  const item = visibleItems.value[index.value]
  if (!item) {
    return
  }

  eventBus.emit('select', item.item.uuid)
  eventBus.emit('scrollIntoView', {
    uuid: item.item.uuid,
    center: true,
  })
  emit('close')
}

const scrollItemIntoView = () => {
  const item = listItems.value[index.value]
  if (item) {
    item.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
}

const buildSearchText = (el: HTMLElement): string => {
  let text = el.textContent || ''

  // Add alt and title attributes.
  el.querySelectorAll('img').forEach((img) => {
    if (img.alt) {
      text += ' ' + img.alt
    }
    if (img.title) {
      text += ' ' + img.title
    }
  })

  return text
}

const buildIndex = () => {
  if (buildForKey.value === state.refreshKey.value) {
    return
  }
  const newItems = dom
    .getAllBlocks()
    .map((item) => {
      const title =
        types.getBlockBundleDefinition(item.itemBundle)?.label ||
        item.itemBundle
      const searchItem = {
        item,
        title: item.editTitle || title,
        context: title,
        text: buildSearchText(item.element()),
      }
      return searchItem
    })
    .filter(falsy)

  items.value = newItems
  buildForKey.value = state.refreshKey.value
}

onMounted(() => {
  buildIndex()
})

const visibleItems = computed(() => {
  if (!words.value.length || !regex.value) {
    return items.value.slice(0, 50)
  }
  const scored = items.value
    .map((item) => {
      let score = 0
      score += (item.text.toLowerCase().match(regex.value!) || []).length
      score += (item.title.toLowerCase().match(regex.value!) || []).length
      if (item.context) {
        score += (item.context.toLowerCase().match(regex.value!) || []).length
      }
      return { item, score }
    })
    .filter((v) => !!v.score)

  scored.sort((a, b) => b.score - a.score)

  return scored.map((v) => v.item).slice(0, 50)
})

watch(visibleItems, () => {
  index.value = 0
  scrollItemIntoView()
})

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      buildIndex()
    }
  },
)

watch(
  () => props.searchBoxVisible,
  (isVisible) => {
    if (isVisible) {
      buildIndex()
    }
  },
)
</script>
