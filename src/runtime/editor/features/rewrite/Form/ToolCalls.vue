<template>
  <div
    v-if="items.length"
    class="bk-rewrite-tool-calls"
    @mouseleave="onMouseLeave"
  >
    <div
      v-for="item in items"
      :key="item.id"
      class="bk-rewrite-tool-call"
      :class="{
        'bk-is-rejected': !item.accepted,
        'bk-is-add': item.tool.name === 'add_block',
        'bk-is-rewrite': item.tool.name === 'rewrite_text',
        'bk-is-delete': item.tool.name === 'delete_block',
        'bk-is-move': item.tool.name === 'move_block',
      }"
      @mouseenter="onMouseEnter(item)"
    >
      <label class="bk-rewrite-tool-call-header bk-checkbox">
        <input
          type="checkbox"
          :checked="item.accepted"
          @change="$emit('toggle', item.id)"
        />
        <span />
        <Icon :name="getToolIcon(item.tool.name)" />
        <span class="bk-rewrite-tool-call-type">{{
          getToolLabel(item.tool.name)
        }}</span>
      </label>
      <div class="bk-rewrite-tool-call-details">
        <template v-if="item.tool.name === 'rewrite_text'">
          <div class="bk-rewrite-tool-call-text">
            {{ truncateText(item.tool.params.value) }}
          </div>
        </template>
        <template v-else-if="item.tool.name === 'add_block'">
          <div class="bk-rewrite-tool-call-bundle">
            {{ item.tool.params.bundle }}
          </div>
          <div
            v-for="(value, key) in item.tool.params.fields"
            :key="key"
            class="bk-rewrite-tool-call-field"
          >
            <span class="bk-rewrite-tool-call-field-name">{{ key }}:</span>
            <span class="bk-rewrite-tool-call-field-value">{{
              truncateText(value)
            }}</span>
          </div>
        </template>
        <template v-else-if="item.tool.name === 'delete_block'">
          <div class="bk-rewrite-tool-call-text">
            {{ item.tool.params.uuid }}
          </div>
        </template>
        <template v-else-if="item.tool.name === 'move_block'">
          <div class="bk-rewrite-tool-call-text">
            Move to {{ item.tool.params.hostFieldName }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import type { PendingToolCall, RewriteTool } from '../types'
import type { BlokkliIcon } from '#blokkli-build/icons'

const { eventBus, dom, blocks } = useBlokkli()

defineProps<{
  items: PendingToolCall[]
}>()

defineEmits<{
  (e: 'toggle', id: string): void
}>()

function getToolIcon(name: RewriteTool['name']): BlokkliIcon {
  switch (name) {
    case 'rewrite_text':
      return 'bk_mdi_edit'
    case 'add_block':
      return 'bk_mdi_add'
    case 'delete_block':
      return 'bk_mdi_delete'
    case 'move_block':
      return 'bk_mdi_drag_pan'
    default:
      return 'bk_mdi_settings'
  }
}

function getToolLabel(name: RewriteTool['name']): string {
  switch (name) {
    case 'rewrite_text':
      return 'Rewrite'
    case 'add_block':
      return 'Add Block'
    case 'delete_block':
      return 'Delete'
    case 'move_block':
      return 'Move'
    default:
      return name
  }
}

function truncateText(text: string, maxLength = 100): string {
  const plainText = text.replace(/<[^>]*>/g, '').trim()
  if (plainText.length <= maxLength) {
    return plainText
  }
  return plainText.slice(0, maxLength) + '...'
}

function onMouseEnter(item: PendingToolCall) {
  // For rewrite_text, highlight the existing block element
  if (
    item.tool.name === 'rewrite_text' ||
    item.tool.name === 'delete_block' ||
    item.tool.name === 'move_block'
  ) {
    const uuid = item.tool.params.uuid
    const block = blocks.getBlock(uuid)
    if (block) {
      const el = dom.getDragElement(block)
      if (el) {
        eventBus.emit('highlight', el)
      }
    }
  }
}

function onMouseLeave() {
  eventBus.emit('highlight', null)
}
</script>
