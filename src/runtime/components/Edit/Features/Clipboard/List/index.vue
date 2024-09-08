<template>
  <Sortli class="bk-clipboard-list">
    <div
      v-for="(item, index) in items"
      :key="index + item.data + renderKey"
      class="bk-parent bk-sidebar-padding"
      data-element-type="clipboard"
      :data-sortli-id="'clipboard_' + index"
      :data-item-bundle="item.itemBundle"
      :data-clipboard-type="item.type"
      :data-clipboard-id="item.id"
      :data-clipboard-data="item.data"
      :data-clipboard-additional="item.additional"
    >
      <div class="bk-clipboard-item">
        <div class="bk bk-clipboard-item-header">
          <div class="bk-blokkli-item-label">
            <div class="bk-blokkli-item-label-icon">
              <ItemIcon :bundle="item.itemBundle" />
            </div>
            <span>{{ getLabel(item.itemBundle) }}</span>
          </div>
          <button @click.prevent.stop.capture="$emit('remove', index)">
            <Icon name="delete" />
          </button>
        </div>
        <div class="bk-drop-element">
          <div
            v-if="item.type === 'text'"
            class="bk-clipboard-item-inner"
            v-html="item.data"
          />
          <ClipboardItemVideo v-if="item.type === 'video'" v-bind="item" />
          <div
            v-else-if="item.type === 'image'"
            class="bk-clipboard-item-image"
          >
            <img :src="item.data" />
          </div>
          <ClipboardItemFile v-else-if="item.type === 'file'" v-bind="item" />
        </div>
      </div>
    </div>
  </Sortli>
</template>

<script lang="ts" setup>
import { ref, useBlokkli } from '#imports'
import { ItemIcon, Icon, Sortli } from '#blokkli/components'
import type { ClipboardItem } from '#blokkli/types'
import ClipboardItemVideo from './Item/Video.vue'
import ClipboardItemFile from './Item/File.vue'

const renderKey = ref(0)

defineProps<{
  items: ClipboardItem[]
}>()

defineEmits<{
  (e: 'remove', index: number): void
}>()

const { types } = useBlokkli()

function getLabel(bundle: string): string {
  return types.getBlockBundleDefinition(bundle)?.label || bundle
}
</script>
