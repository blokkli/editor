<template>
  <div
    class="relative"
    @dragenter.stop.prevent="onDragEnter"
    @dragleave.stop="onDragLeave"
    @dragover.stop.prevent="onDragOver"
    @drop.stop.prevent="onDrop"
  >
    <slot />
    <Transition name="bk-file-drop" :duration="200">
      <div
        v-if="isDragOver"
        class="absolute inset-0 pointer-events-none flex items-center justify-center"
        :style="{ zIndex: 50 }"
      >
        <div
          class="bk-file-drop-backdrop absolute inset-0 bg-mono-900/95 backdrop-blur-lg"
        />
        <div
          class="bk-file-drop-content relative flex flex-col items-center gap-8 text-mono-100 font-semibold text-base"
        >
          <Icon :name="icon" class="size-80" />
          <span>{{ label }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
import { ref } from '#imports'
import { Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'

const props = defineProps<{
  icon: BlokkliIcon
  label: string
  accept?: (item: DataTransferItem) => boolean
}>()

const emit = defineEmits<{
  drop: [files: File[]]
}>()

let dragCounter = 0
const isDragOver = ref(false)

function hasAcceptableItems(
  dt: DataTransfer,
  accept?: (item: DataTransferItem) => boolean,
): boolean {
  for (const item of dt.items) {
    if (item.kind !== 'file') continue
    if (!accept || accept(item)) return true
  }
  return false
}

function onDragEnter(e: DragEvent) {
  dragCounter++
  if (
    e.dataTransfer?.types.includes('Files') &&
    hasAcceptableItems(e.dataTransfer, props.accept)
  ) {
    isDragOver.value = true
  }
}

function onDragLeave() {
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    isDragOver.value = false
  }
}

function onDragOver(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

function onDrop(e: DragEvent) {
  dragCounter = 0
  isDragOver.value = false

  const items = e.dataTransfer?.items
  if (!items?.length) return

  const files: File[] = []
  for (const item of items) {
    if (item.kind !== 'file') continue
    if (props.accept && !props.accept(item)) continue
    const file = item.getAsFile()
    if (file) {
      files.push(file)
    }
  }

  if (files.length) {
    emit('drop', files)
  }
}
</script>

<style lang="postcss">
.bk-file-drop-enter-active,
.bk-file-drop-leave-active {
  .bk-file-drop-content {
    @apply transition-all ease-swing duration-300;
  }

  .bk-file-drop-backdrop {
    @apply transition-opacity ease-swing duration-200;
  }
}

.bk-file-drop-enter-from,
.bk-file-drop-leave-to {
  .bk-file-drop-backdrop {
    opacity: 0;
  }

  .bk-file-drop-content {
    opacity: 0;
    transform: scale(0.8);
  }
}
</style>
