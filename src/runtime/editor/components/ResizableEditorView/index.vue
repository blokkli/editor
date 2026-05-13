<template>
  <div
    class="bg-mono-100 h-full flex flex-col border-t border-t-mono-400"
    @wheel.capture.stop
  >
    <div class="grid grid-cols-[1fr_auto] flex-1 h-full">
      <div
        ref="leftEl"
        class="relative bg-white border-r border-r-mono-300 overflow-hidden"
      >
        <div
          class="absolute top-0 left-0 h-full"
          :style="{
            width: width + 'px',
          }"
        >
          <div
            class="flex border-b border-mono-700 h-50 bg-mono-900 items-center"
          >
            <slot name="toolbar" />
          </div>
          <slot name="left" />
        </div>
      </div>

      <Resizable
        :id
        class="h-full max-h-full relative"
        :min-width
        :max-width
        @done="onAfterResize"
      >
        <div
          class="absolute top-0 left-0 size-full p-20 overflow-auto bk-scrollbar-light"
        >
          <slot name="right" />
        </div>
      </Resizable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onElementResize } from '#blokkli/editor/composables'
import { useTemplateRef, ref, computed, useBlokkli } from '#imports'
import Resizable from './../Resizable/index.vue'

const props = defineProps<{
  id: string
  minWidthLeft?: number
  minWidthRight?: number
}>()

const emit = defineEmits<{
  (e: 'after-resize'): void
}>()

const { ui } = useBlokkli()

const leftEl = useTemplateRef('leftEl')

const width = ref(0)
const currentWidth = ref(0)

const minWidth = computed<number>(() => {
  return props.minWidthRight || 400
})

const maxWidth = computed<number>(() => {
  return ui.viewport.value.width - (props.minWidthLeft || 200)
})

onElementResize(leftEl, (size) => {
  currentWidth.value = size.width
  if (!width.value) {
    width.value = currentWidth.value
  }
})

function onAfterResize() {
  width.value = currentWidth.value
  emit('after-resize')
}
</script>
