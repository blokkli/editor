<template>
  <Teleport :to="ui.mainLayoutElement.value" defer>
    <BlokkliTransition name="search">
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
          :is-dragging="selection.isDragging.value"
          @close="isVisible = false"
        />
      </div>
    </BlokkliTransition>
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
    icon="bk_mdi_search"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { nextTick, ref, useBlokkli, defineBlokkliFeature, useTemplateRef } from '#imports'
import Overlay from './Overlay/index.vue'
import { BlokkliTransition } from '#blokkli/editor/components'
import { PluginToolbarButton } from '#blokkli/editor/plugins'
import { onBlokkliEvent } from '#blokkli/editor/composables'

defineBlokkliFeature({
  id: 'search',
  icon: 'bk_mdi_search',
  label: 'Search',
  description:
    'Provides an overlay with shortcut to search for blocks on the current page or existing content to add as blocks.',
})

const { $t, selection, ui } = useBlokkli()

const isRendered = ref(false)
const isVisible = ref(false)

const overlay = useTemplateRef('overlay')

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
  if (ui.hasDialogOpen.value) {
    return
  }
  if (e.code === 'Escape') {
    isVisible.value = false
  }
})
</script>

<script lang="ts">
export default {
  name: 'FeatureSearch',
}
</script>
