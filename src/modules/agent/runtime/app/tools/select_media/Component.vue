<template>
  <ToolCard
    icon="bk_mdi_image"
    :title="params.prompt || $t('mediaSelectTitle', 'Select a media item')"
    @cancel="cancel"
  >
    <div class="bk-media-select-list">
      <button
        v-for="item in params.items"
        :key="item.mediaId"
        type="button"
        class="bk-media-select-item"
        :class="{ 'bk-is-selected': selectedId === item.mediaId }"
        @click="selectedId = item.mediaId"
      >
        <div class="bk-media-select-thumbnail">
          <img v-if="item.thumbnail" :src="item.thumbnail" :alt="item.label" />
          <Icon v-else name="bk_mdi_image" />
        </div>
        <div class="bk-media-select-label">{{ item.label }}</div>
      </button>
    </div>

    <template #actions>
      <button
        class="bk-button bk-is-small bk-is-lime bk-is-fullwidth"
        :disabled="!selectedId"
        @click="confirm"
      >
        <Icon name="bk_mdi_check" />
        {{ $t('mediaSelectConfirm', 'Use selected') }}
      </button>
    </template>
  </ToolCard>
</template>

<script lang="ts" setup>
import { ref, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import ToolCard from '../../features/agent/Panel/ToolCard/index.vue'
import type { McpToolContext } from '#blokkli/agent/app/types'
import type {
  SelectMediaParams,
  SelectMediaResult,
  SelectMediaItem,
} from './index'

const props = defineProps<{
  context: McpToolContext
  params: SelectMediaParams
}>()

const emit = defineEmits<{
  (e: 'done', result: SelectMediaResult): void
}>()

const { $t } = useBlokkli()

const selectedId = ref<string | null>(null)

function getSelectedItem(): SelectMediaItem | null {
  if (!selectedId.value) return null
  return (
    props.params.items.find((item) => item.mediaId === selectedId.value) || null
  )
}

function confirm() {
  const item = getSelectedItem()
  if (item) {
    emit('done', {
      selected: {
        mediaId: item.mediaId,
        label: item.label,
        mediaBundle: item.mediaBundle,
        thumbnail: item.thumbnail,
      },
      label:
        props.params.prompt || $t('mediaSelectTitle', 'Select a media item'),
      userMessage: item.label,
    })
  }
}

function cancel() {
  emit('done', { selected: null })
}
</script>
