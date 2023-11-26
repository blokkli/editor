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
        placeholder="Inhalt durchsuchen"
        ref="input"
        autocomplete="off"
        spellcheck="false"
        required
      />
    </div>
    <div class="pb-search-results">
      <ul class="pb-search-list">
        <li
          v-for="(item, i) in visibleItems"
          :class="{ 'pb-is-active': i === index }"
          @mouseenter="index = i"
          @click.stop="clickItem"
          ref="listItems"
        >
          <div class="pb-search-item-icon">
            <ParagraphIcon :bundle="item.item.paragraphType" />
          </div>
          <div>
            <Highlight tag="h2" :text="item.title" :search="searchCleaned" />
            <Highlight
              class="pb-search-item-text"
              :text="item.text"
              :search="searchCleaned"
            />
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { DraggableExistingParagraphItem } from '#pb/types'
import { buildDraggableItem, falsy, modulo } from '#pb/helpers'
import { Icon, ParagraphIcon } from '#pb/components'
import Highlight from './Highlight/index.vue'

const listItems = ref<HTMLLIElement[]>([])

const emit = defineEmits(['close'])

const props = defineProps<{
  visible: boolean
}>()

type SearchItem = {
  item: DraggableExistingParagraphItem
  title: string
  text: string
}

const { entityUuid, allTypes, eventBus } = useParagraphsBuilderStore()

const typeLabelMap = computed(() => {
  return allTypes.value.reduce<Record<string, string>>((acc, v) => {
    if (v.id && v.label) {
      acc[v.id] = v.label
    }
    return acc
  }, {})
})

const search = ref('')
const input = ref<HTMLInputElement | null>(null)

const items = ref<SearchItem[]>([])
const index = ref(0)

const searchCleaned = computed(() => search.value.toLowerCase().trim())

const setIndex = (newIndex: number) => {
  index.value = modulo(newIndex, visibleItems.value.length)
}

const clickItem = () => {
  const item = visibleItems.value[index.value]
  if (!item) {
    return
  }

  eventBus.emit('select', item.item.uuid)
  eventBus.emit('paragraph:scrollIntoView', {
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

const onKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Tab') {
    setIndex(e.shiftKey ? index.value - 1 : index.value + 1)
  } else if (e.code === 'ArrowDown') {
    setIndex(index.value + 1)
  } else if (e.code === 'ArrowUp') {
    setIndex(index.value - 1)
  } else if (e.code === 'Enter') {
    clickItem()
    return
  } else if (e.code === 'Escape') {
    emit('close')
  } else {
    return
  }
  e.preventDefault()
  e.stopPropagation()
  scrollItemIntoView()
}

const buildSearchText = (el: HTMLElement): string => {
  let text = el.innerText

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
  const paragraphs = document.body.querySelectorAll(
    `[data-host-entity-uuid="${entityUuid}"] [data-uuid]`,
  )

  const newItems = [...paragraphs]
    .map((el) => {
      if (el instanceof HTMLElement) {
        const item = buildDraggableItem(el)
        if (item?.itemType === 'existing') {
          const searchItem = {
            item,
            title: typeLabelMap.value[item.paragraphType] || item.paragraphType,
            text: buildSearchText(el),
          }
          return searchItem
        }
      }
    })
    .filter(falsy)

  items.value = newItems
}

const focusInput = () => {
  if (input.value) {
    input.value.focus()
    input.value.select()
  }
}

onMounted(() => {
  focusInput()
  buildIndex()
})

defineExpose({ focusInput })

const visibleItems = computed(() => {
  if (!searchCleaned.value) {
    return items.value
  }
  return items.value.filter(
    (v) =>
      v.text.toLowerCase().includes(searchCleaned.value) ||
      v.title.toLowerCase().includes(searchCleaned.value),
  )
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
      if (input.value) {
        input.value.focus()
      }
    }
  },
)
</script>
