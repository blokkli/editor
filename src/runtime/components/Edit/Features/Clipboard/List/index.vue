<template>
  <ul ref="listEl" class="bk-clipboard-list">
    <li
      v-for="(item, index) in items"
      :key="index + item.data + renderKey"
      class="bk-clone bk-parent"
      data-element-type="clipboard"
      :data-item-bundle="item.itemBundle"
      :data-clipboard-type="item.type"
      :data-clipboard-data="item.data"
      :data-clipboard-additional="item.additional"
      :data-clipboard-search-item="
        item.type === 'search_content' ? JSON.stringify(item.item) : undefined
      "
    >
      <div class="bk-clipboard-item">
        <div class="bk bk-clipboard-item-header">
          <div class="bk-blokkli-item-label">
            <div class="bk-blokkli-item-label-icon">
              <ItemIcon :bundle="item.itemBundle" />
            </div>
            <span>{{ getLabel(item.itemBundle) }}</span>
          </div>
          <button @click="$emit('remove', index)">
            <Icon name="delete" />
          </button>
        </div>
        <div>
          <div
            v-if="item.type === 'text'"
            class="bk-clipboard-item-inner"
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
          <div v-else-if="item.type === 'search_content'">
            <SearchContentItem
              :target-bundle="item.itemBundle"
              :data="item.data"
            />
          </div>
        </div>
      </div>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { ItemIcon, Icon } from '#blokkli/components'
import { Sortable } from '#blokkli/sortable'
import type { ClipboardItem } from '#blokkli/types'
import SearchContentItem from './SearchContent/index.vue'

let instance: Sortable | null = null

const listEl = ref<HTMLDivElement | null>(null)
const renderKey = ref(0)

defineProps<{
  items: ClipboardItem[]
}>()

const emit = defineEmits<{
  (e: 'remove', index: number): void
}>()

const { types, eventBus } = useBlokkli()

function getLabel(bundle: string): string {
  return types.allTypes.value.find((v) => v.id === bundle)?.label || bundle
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
        if (e.oldIndex !== undefined) {
          emit('remove', e.oldIndex)
        }
        renderKey.value += 1
      },
      forceFallback: true,
      animation: 300,
      onStart(e) {
        const rect = e.item.getBoundingClientRect()
        const originalEvent = (e as any).originalEvent || ({} as PointerEvent)
        eventBus.emit('dragging:start', {
          rect,
          offsetX: originalEvent.clientX,
          offsetY: originalEvent.clientY,
        })
      },
      onEnd() {
        eventBus.emit('dragging:end')
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
