<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="touch-bar">
      <Bar
        v-if="
          selection.isMultiSelecting.value &&
          selection.interactionMode.value === 'touch'
        "
        :label="$t('touchBarFinishSelecting', 'Finish selecting')"
        @click="eventBus.emit('select:end', [...selection.uuids.value])"
      />
      <Bar
        v-else-if="
          selection.isDragging.value && selection.draggingMode.value === 'touch'
        "
        :label="$t('touchBarCancelDragging', 'Cancel dragging')"
        danger
        @click="eventBus.emit('dragging:end')"
      />
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { BlokkliTransition } from '#blokkli/editor/components'
import Bar from './Bar/index.vue'

const { eventBus, selection, $t, ui } = useBlokkli()

defineBlokkliFeature({
  id: 'touch-action-bar',
  label: 'Touch Action Bar',
  description: 'Renders a button on touch devices to cancel touch actions.',
  icon: 'bk_mdi_trackpad_input',
})
</script>

<script lang="ts">
export default {
  name: 'TouchActionBarBar',
}
</script>
