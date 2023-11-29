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
  <PluginToolbarButton
    title="Inhalte suchen"
    meta
    key-code="F"
    region="before-view-options"
    @click="onClick"
    icon="search"
  />
</template>

<script lang="ts" setup>
/**
 * Provides a fulltext search for paragraphs.
 */
import { KeyPressedEvent } from '#pb/types'
import Overlay from './Overlay/index.vue'
import { PluginToolbarButton } from '#pb/plugins'

const { eventBus } = useBlokkli()

const isRendered = ref(false)
const isVisible = ref(false)

const overlay = ref<InstanceType<typeof Overlay> | null>(null)

function onClick() {
  isRendered.value = true
  isVisible.value = !isVisible.value
  nextTick(() => {
    if (isVisible.value && overlay.value) {
      overlay.value.focusInput()
    }
  })
}

const onKeypress = (e: KeyPressedEvent) => {
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
