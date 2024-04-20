<template>
  <Overlay
    v-if="shouldRender"
    :start-x="downX"
    :start-y="downY"
    @select="onSelect"
  />
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { ref, useBlokkli, defineBlokkliFeature, computed } from '#imports'
import Overlay from './Overlay/index.vue'

defineBlokkliFeature({
  id: 'multi-select',
  label: 'Multiselect',
  icon: 'multi-select',
  description:
    'Implements support for selecting multiple blocks using a select rectangle.',
  viewports: ['desktop'],
})

const { keyboard, eventBus, selection, state } = useBlokkli()

const enabled = computed(
  () => !selection.editableActive.value && state.editMode.value === 'editing',
)

const shouldRender = ref(false)
const downX = ref(0)
const downY = ref(0)

const onSelect = (uuids: string[]) => {
  shouldRender.value = false
  eventBus.emit('select:end', uuids)
}

let startTimeout: any = null

onBlokkliEvent('mouse:down', (e) => {
  if (!enabled.value || e.type !== 'mouse') {
    return
  }
  if (keyboard.isPressingSpace.value || keyboard.isPressingControl.value) {
    return
  }
  clearTimeout(startTimeout)
  downX.value = e.x
  downY.value = e.y

  startTimeout = setTimeout(() => {
    shouldRender.value = true
  }, 100)
})

onBlokkliEvent('mouse:up', () => {
  shouldRender.value = false
  clearTimeout(startTimeout)
})
</script>

<script lang="ts">
export default {
  name: 'MultiSelect',
}
</script>
