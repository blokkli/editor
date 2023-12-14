<template>
  <Sortli class="bk-clipboard-list">
    <div
      v-for="(item, index) in items"
      :key="index + item.data + renderKey"
      class="bk-clone bk-parent"
      data-element-type="clipboard"
      :data-sortli-id="'clipboard_' + index"
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
    </div>
  </Sortli>
</template>

<script lang="ts" setup>
import { ref, useBlokkli } from '#imports'
import { ItemIcon, Icon, Sortli } from '#blokkli/components'
import type { ClipboardItem } from '#blokkli/types'
import SearchContentItem from './SearchContent/index.vue'

const renderKey = ref(0)

defineProps<{
  items: ClipboardItem[]
}>()

defineEmits<{
  (e: 'remove', index: number): void
}>()

const { types } = useBlokkli()

function getLabel(bundle: string): string {
  return types.allTypes.value.find((v) => v.id === bundle)?.label || bundle
}
</script>
