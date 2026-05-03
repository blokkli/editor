<template>
  <div class="bk bk-clipboard-drop-element">
    <div class="bk-clipboard-drop-element-header">
      <div v-if="bundles.length === 1" class="bk-blokkli-item-label-icon">
        <ItemIconBox :bundle="bundles[0]!" :icon is-small />
      </div>
      <span>{{ label }}</span>
    </div>
    <div v-if="items.length" class="bk-clipboard-drop-element-preview">
      <div
        v-for="(item, i) in items"
        :key="i"
        class="bk-clipboard-drop-element-item"
      >
        <div
          v-if="item.type === 'text' && item.data"
          class="bk-clipboard-drop-element-text"
          v-html="item.data"
        />
        <template v-else-if="item.type === 'video' && item.videoId">
          <ClipboardItemVideo
            :data="item.data || ''"
            :video-service="item.videoService"
            :video-id="item.videoId"
          />
        </template>
        <template v-else>
          <img v-if="item.type === 'image' && item.data" :src="item.data" />
          <div v-else class="bk-clipboard-drop-element-file-icon">
            <Icon :name="getItemIcon(item.type)" />
          </div>
          <p v-if="item.fileName" class="bk-clipboard-drop-element-item-label">
            {{ item.fileName }}
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli, computed } from '#imports'
import { Icon, ItemIconBox } from '#blokkli/editor/components'
import ClipboardItemVideo from './Video.vue'
import type { BlokkliIcon } from '#blokkli-build/icons'

export type DropElementItemType = 'image' | 'video' | 'file' | 'text'

export type DropElementItem = {
  type: DropElementItemType
  data?: string
  fileName?: string
  fileSize?: number
  videoId?: string
  videoService?: string
}

const props = defineProps<{
  bundles: string[]
  items: DropElementItem[]
}>()

const { types, $t } = useBlokkli()

const itemType = computed<DropElementItemType>(() => {
  return props.items[0]?.type || 'file'
})

function getItemIcon(type: DropElementItemType): BlokkliIcon {
  switch (type) {
    case 'image':
      return 'bk_mdi_image'
    case 'video':
      return 'bk_mdi_video_camera_back'
    case 'file':
      return 'bk_mdi_attach_file'
    case 'text':
      return 'bk_mdi_title'
    default:
      return 'bk_mdi_upload'
  }
}

const label = computed<string | null>(() => {
  let base: string | null = null
  if (props.bundles.length === 1 && props.bundles[0]) {
    base =
      types.getBlockBundleDefinition(props.bundles[0])?.label ||
      props.bundles[0]
  } else {
    switch (itemType.value) {
      case 'image':
        base = $t('clipboardTypeImage', 'Image')
        break
      case 'video':
        base = $t('clipboardTypeVideo', 'Video')
        break
      case 'file':
        base = $t('clipboardTypeFile', 'File')
        break
      case 'text':
        base = $t('clipboardTypeText', 'Text')
        break
    }
  }
  if (!base) {
    return null
  }
  const suffix = props.bundles.length > 1 ? '...' : ''
  if (props.items.length > 1) {
    return `${props.items.length} x ${base}${suffix}`
  }
  return base + suffix
})

const icon = computed<BlokkliIcon>(() => getItemIcon(itemType.value))
</script>

<style lang="postcss">
.bk {
  .bk-clipboard-drop-element {
    @apply pointer-events-none;
    @apply flex flex-col;
    @apply bg-white rounded shadow-lg border border-mono-200;
    @apply overflow-hidden;
    width: 350px;
    height: 200px;

    .bk-clipboard-drop-element-header {
      @apply flex gap-10 p-15 font-semibold bg-mono-800 text-mono-100;
    }

    .bk-clipboard-drop-element-preview {
      @apply flex;
      @apply overflow-hidden;
      flex: 1;
      min-height: 0;

      .bk-clipboard-drop-element-item {
        @apply flex-1 min-w-0 relative overflow-hidden;
      }

      .bk-clipboard-drop-element-text {
        @apply p-8 text-xs font-sans text-mono-700 line-clamp-6 h-full;
      }

      img {
        @apply block w-full h-full object-cover;
      }

      .bk-clipboard-drop-element-file-icon {
        @apply flex items-center justify-center h-full bg-mono-100;

        svg {
          @apply size-24 fill-mono-400;
        }
      }

      .bk-clipboard-drop-element-item-label {
        @apply absolute bottom-0 left-0 right-0;
        @apply text-xs font-sans text-white leading-none truncate;
        @apply p-5;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
      }

      .bk-clipboard-item-video {
        @apply text-xs;
      }
    }
  }

  .bk-clipboard-item-video {
    @apply relative aspect-video overflow-hidden border border-mono-300;
    @apply bg-mono-900 text-mono-50;
    img {
      @apply block object-cover absolute top-0 left-0 w-full h-full;
    }

    > div {
      @apply absolute z-30 left-0 w-full bottom-0 p-10;
      @apply bg-gradient-to-b from-mono-900/0 to-mono-900;
      svg {
        @apply size-20 fill-current;
      }

      p {
        @apply text-xs;
      }

      > div {
        @apply flex gap-5 font-bold;
      }
    }
  }
}
</style>
