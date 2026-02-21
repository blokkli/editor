<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <Transition name="bk-clipboard-drag">
      <div v-show="isDragging" class="bk bk-clipboard-dragging">
        <div class="bk-clipboard-dragging-content">
          <ItemIconBox :icon="dragIcon" />
          <span>{{ dragLabel }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, onMounted, onUnmounted } from '#imports'
import { ItemIconBox } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'

const { ui, $t } = useBlokkli()

type DragType = 'image' | 'video' | 'file' | 'text'

// Set to a DragType to always show the indicator for debugging.
const DEBUG: DragType | null = null

const emit = defineEmits<{
  drop: [data: DataTransfer]
}>()

const isDragging = ref(!!DEBUG)
const dragType = ref<DragType | null>(DEBUG)
let dragCounter = 0

const dragIcon = computed<BlokkliIcon>(() => {
  switch (dragType.value) {
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
})

const dragLabel = computed(() => {
  switch (dragType.value) {
    case 'image':
      return $t('clipboardDropImage', 'Drop image here to add block')
    case 'video':
      return $t('clipboardDropVideo', 'Drop video here to add block')
    case 'file':
      return $t('clipboardDropFile', 'Drop file here to add block')
    case 'text':
      return $t('clipboardDropText', 'Drop text here to add block')
    default:
      return $t('clipboardDrop', 'Drop here to add block')
  }
})

function detectDragType(e: DragEvent): DragType | null {
  const dt = e.dataTransfer
  if (!dt) {
    return null
  }

  if (dt.items && dt.items.length > 0) {
    for (let i = 0; i < dt.items.length; i++) {
      const item = dt.items[i]
      if (!item) {
        continue
      }
      if (item.kind === 'file') {
        if (item.type.startsWith('image/')) {
          return 'image'
        }
        if (item.type.startsWith('video/')) {
          return 'video'
        }
        return 'file'
      }
      if (item.kind === 'string') {
        return 'text'
      }
    }
  }

  if (dt.types.includes('Files')) {
    return 'file'
  }

  return null
}

function reset() {
  dragCounter = 0
  isDragging.value = false
}

function onDragEnter(e: DragEvent) {
  dragCounter++
  if (dragCounter === 1) {
    dragType.value = detectDragType(e)
  }
  isDragging.value = true
}

function onDragLeave() {
  dragCounter--
  if (dragCounter <= 0) {
    reset()
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  reset()
  if (e.dataTransfer) {
    emit('drop', e.dataTransfer)
  }
}

onMounted(() => {
  document.addEventListener('dragenter', onDragEnter)
  document.addEventListener('dragleave', onDragLeave)
  document.addEventListener('dragend', reset)
  document.addEventListener('dragover', onDragOver)
  document.addEventListener('drop', onDrop)
})

onUnmounted(() => {
  document.removeEventListener('dragenter', onDragEnter)
  document.removeEventListener('dragleave', onDragLeave)
  document.removeEventListener('dragend', reset)
  document.removeEventListener('dragover', onDragOver)
  document.removeEventListener('drop', onDrop)
})
</script>

<script lang="ts">
export default {
  name: 'ClipboardDragIndicator',
}
</script>
