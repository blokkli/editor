<template>
  <Teleport to="body">
    <Transition name="bk-touch-bar">
      <Bar
        v-if="selection.isMultiSelecting.value && ui.isMobile.value"
        :label="$t('touchBarFinishSelecting', 'Finish selecting')"
        @click="eventBus.emit('select:end', [...selection.uuids.value])"
      />
      <Bar
        v-else-if="selection.isDragging.value && isTouch"
        :label="$t('touchBarCancelDragging', 'Cancel dragging')"
        danger
        @click="eventBus.emit('dragging:end')"
      />
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, computed } from '#imports'
import Bar from './Bar/index.vue'

const { eventBus, selection, ui, $t } = useBlokkli()

const isTouch = computed(() => selection.draggingMode.value === 'touch')

defineBlokkliFeature({
  id: 'touch-action-bar',
  label: 'Touch Action Bar',
  description: 'Renders a button on touch devices to cancel touch actions.',
  icon: 'button-pointer',
})
</script>

<script lang="ts">
export default {
  name: 'TouchActionBarBar',
}
</script>
