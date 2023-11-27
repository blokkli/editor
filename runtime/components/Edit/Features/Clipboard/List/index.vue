<template>
  <ul ref="listEl" class="pb-clipboard-list">
    <li
      v-for="(item, index) in items"
      class="pb-clone pb-parent"
      data-element-type="clipboard"
      :data-paragraph-type="item.paragraphType"
      :data-clipboard-type="item.type"
      :data-clipboard-data="item.data"
      :data-clipboard-additional="item.additional"
      :data-clipboard-search-item="
        item.type === 'search_content' ? JSON.stringify(item.item) : undefined
      "
      :key="item.data + renderKey"
    >
      <div class="pb-clipboard-item">
        <div class="pb-clipboard-item-header">
          <div class="pb-paragraph-label">
            <div class="pb-paragraph-label-icon">
              <ParagraphIcon :bundle="item.paragraphType" />
            </div>
            <span>{{ getLabel(item.paragraphType) }}</span>
          </div>
          <button @click="$emit('remove', index)">
            <Icon name="delete" />
          </button>
        </div>
        <div>
          <div
            v-if="item.type === 'text' || item.type === 'search_content'"
            class="pb-clipboard-item-inner"
            v-html="item.data"
          />
          <div v-if="item.type === 'youtube'">
            <img :src="`http://i3.ytimg.com/vi/${item.data}/hqdefault.jpg`" />
          </div>
          <div v-else-if="item.type === 'image'">
            <img :src="item.data" />
          </div>
          <div v-else-if="item.type === 'search_content' && item.item.imageUrl">
            <img :src="item.item.imageUrl" />
          </div>
        </div>
      </div>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { ParagraphIcon, Icon } from '#pb/components'
import { Sortable } from '#pb/sortable'
import { PbSearchContentItem } from '~/modules/nuxt-paragraphs-builder/runtime/types'

let instance: Sortable | null = null

const listEl = ref<HTMLDivElement | null>(null)
const renderKey = ref(0)

interface ClipboardItemText {
  type: 'text'
  paragraphType: string
  data: string
  additional?: string
}

interface ClipboardItemYouTube {
  type: 'youtube'
  paragraphType: string
  data: string
  additional?: string
}

interface ClipboardItemImage {
  type: 'image'
  paragraphType: string
  data: string
  additional: string
}

interface ClipboardItemSearchContent {
  type: 'search_content'
  paragraphType: string
  data: string
  item: PbSearchContentItem
  additional?: string
}

export type ClipboardItem =
  | ClipboardItemText
  | ClipboardItemYouTube
  | ClipboardItemImage
  | ClipboardItemSearchContent

defineProps<{
  items: ClipboardItem[]
}>()

const emit = defineEmits<{
  (e: 'remove', index: number): void
}>()

const { allTypes, eventBus } = useParagraphsBuilderStore()

function getLabel(bundle: string): string {
  return allTypes.value.find((v) => v.id === bundle)?.label || bundle
}

onMounted(() => {
  if (listEl.value) {
    instance = new Sortable(listEl.value, {
      sort: false,
      group: {
        name: 'types',
        put: false,
        revertClone: false,
      },
      onRemove(e) {
        renderKey.value += 1
      },
      forceFallback: true,
      animation: 300,
      onStart(e) {
        const rect = e.item.getBoundingClientRect()
        const originalEvent = (e as any).originalEvent || ({} as PointerEvent)
        eventBus.emit('draggingStart', {
          rect,
          offsetX: originalEvent.clientX,
          offsetY: originalEvent.clientY,
        })
      },
      onEnd() {
        eventBus.emit('draggingEnd')
      },
    })
  }
})

onUnmounted(() => {
  if (instance) {
    instance.destroy()
  }
})
</script>
