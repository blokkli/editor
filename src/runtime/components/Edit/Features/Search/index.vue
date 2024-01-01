<template>
  <Teleport to="body">
    <Transition name="bk-search">
      <div
        v-if="isRendered"
        v-show="isVisible"
        class="bk bk-search"
        @click.stop.prevent="isVisible = false"
      >
        <Overlay
          ref="overlay"
          :visible="isVisible"
          @close="isVisible = false"
        />
      </div>
    </Transition>
  </Teleport>
  <PluginToolbarButton
    id="search"
    :title="$t('searchToolbarLabel')"
    meta
    key-code="F"
    region="before-view-options"
    icon="search"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import {
  nextTick,
  ref,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  defineBlokkliFeature,
} from '#imports'
import type { KeyPressedEvent } from '#blokkli/types'
import Overlay from './Overlay/index.vue'
import { PluginToolbarButton } from '#blokkli/plugins'

defineBlokkliFeature({
  description:
    'Provides an overlay with shortcut to search for blocks on the current page or existing content to add as blocks.',
})

const { eventBus, $t } = useBlokkli()

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

<script lang="ts">
export default {
  name: 'Search',
}
</script>
