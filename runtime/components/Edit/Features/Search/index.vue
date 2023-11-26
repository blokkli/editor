<template>
  <Teleport to="body">
    <Transition name="pb-search">
      <div
        v-if="isRendered"
        v-show="isVisible"
        class="pb pb-search pb-overlay"
        @click.stop.prevent="isVisible = false"
      >
        <Overlay
          ref="overlay"
          @close="isVisible = false"
          :visible="isVisible"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
/**
 * Provides a fulltext search for paragraphs.
 */
import { KeyPressedEvent } from '#pb/types'
import Overlay from './Overlay/index.vue'

const { eventBus } = useParagraphsBuilderStore()

const isRendered = ref(false)
const isVisible = ref(false)

const overlay = ref<InstanceType<typeof Overlay> | null>(null)

const onKeypress = (e: KeyPressedEvent) => {
  if (e.code === 'f' && e.meta) {
    isRendered.value = true
    isVisible.value = !isVisible.value
    e.originalEvent.preventDefault()
    nextTick(() => {
      if (isVisible.value && overlay.value) {
        overlay.value.focusInput()
      }
    })
    return
  }

  if (e.code === 'Escape') {
    isVisible.value = false
  }
}

onMounted(() => {
  eventBus.on('keyPressed', onKeypress)
})

onBeforeUnmount(() => {
  eventBus.off('keyPressed', onKeypress)
})
</script>
