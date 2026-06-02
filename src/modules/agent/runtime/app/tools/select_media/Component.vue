<template>
  <ToolCard
    icon="bk_mdi_image"
    :title="params.prompt || $t('mediaSelectTitle', 'Select a media item')"
    @cancel="cancel"
  >
    <div class="flex flex-col divide-y divide-mono-200">
      <button
        v-for="item in params.items"
        :key="item.mediaId"
        type="button"
        class="flex items-center gap-10 px-10 py-8 cursor-pointer hover:bg-mono-50"
        :class="{ 'bg-accent-100': selectedId === item.mediaId }"
        @click="selectedId = item.mediaId"
      >
        <div
          class="size-100 bg-mono-100 rounded overflow-hidden shrink-0 flex items-center justify-center"
          :class="{
            'outline outline-accent-700 relative z-40':
              selectedId === item.mediaId,
          }"
        >
          <img
            v-if="item.thumbnail"
            :src="item.thumbnail"
            :alt="item.label"
            class="w-full h-full object-cover"
          />
          <Icon v-else name="bk_mdi_image" class="w-20 h-20 text-mono-300" />
        </div>
        <div
          class="text-sm text-mono-700 flex-1 break-words max-w-full overflow-hidden"
        >
          {{ item.label }}
        </div>
      </button>
    </div>

    <template #actions>
      <button
        class="bk-button bk-is-small bk-scheme-lime bk-is-fullwidth"
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
    const prompt =
      props.params.prompt || $t('mediaSelectTitle', 'Select a media item')
    emit('done', {
      selected: {
        mediaId: item.mediaId,
        label: item.label,
        mediaBundle: item.mediaBundle,
        thumbnail: item.thumbnail,
      },
      label: `${prompt} -> ${item.label}`,
    })
  }
}

function cancel() {
  emit('done', { selected: null })
}
</script>
