<template>
  <Teleport to="body">
    <Transition name="bk-search">
      <div
        v-if="isRendered"
        v-show="isVisible"
        class="bk bk-search"
        :class="{ 'bk-is-translucent': selection.isDragging.value }"
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
    :title="$t('searchToolbarLabel', 'Search content')"
    meta
    key-code="F"
    region="before-sidebar-right"
    :tour-text="
      $t(
        'searchTourText',
        'Quickly find blocks on the current page or existing content to drag and drop as blocks into the page.',
      )
    "
    icon="search"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { nextTick, ref, useBlokkli, defineBlokkliFeature } from '#imports'
import Overlay from './Overlay/index.vue'
import { PluginToolbarButton } from '#blokkli/plugins'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

defineBlokkliFeature({
  id: 'search',
  icon: 'search',
  label: 'Search',
  description:
    'Provides an overlay with shortcut to search for blocks on the current page or existing content to add as blocks.',
})

const { $t, selection } = useBlokkli()

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

onBlokkliEvent('keyPressed', (e) => {
  if (e.code === 'Escape') {
    isVisible.value = false
  }
})
</script>

<script lang="ts">
export default {
  name: 'Search',
}
</script>
