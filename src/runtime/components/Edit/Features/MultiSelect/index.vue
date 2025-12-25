<template>
  <ErrorBoundary
    v-model="isLocked"
    :label="$t('feature_multi-select_label', 'Multiselect')"
    @error="onError"
  >
    <Renderer
      v-if="shouldRender"
      :key="animation.renderKey.value"
      :start-x="downX"
      :start-y="downY"
      :is-pressing-control="keyboard.isPressingControl.value"
      @select="onSelect"
    />
  </ErrorBoundary>
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { ref, useBlokkli, defineBlokkliFeature, computed } from '#imports'
import { ErrorBoundary } from '#blokkli/components'
import Renderer from './Renderer/index.vue'

defineBlokkliFeature({
  id: 'multi-select',
  label: 'Multiselect',
  icon: 'multi-select',
  description:
    'Implements support for selecting multiple blocks using a select rectangle.',
  viewports: ['desktop'],
})

const { keyboard, eventBus, selection, animation, $t } = useBlokkli()

const isLocked = ref(false)
const enabled = computed(
  () => !selection.activeEditableLabel.value && !isLocked.value,
)

const shouldRender = ref(false)
const downX = ref(0)
const downY = ref(0)

function onError() {
  eventBus.emit('select:end')
  shouldRender.value = false
}

const onSelect = (uuids: string[]) => {
  shouldRender.value = false
  eventBus.emit('select:end', uuids)
}

const startTimeout: any = null

onBlokkliEvent('multi-select:start', (e) => {
  if (!enabled.value) {
    return
  }
  downX.value = e.x
  downY.value = e.y
  eventBus.emit('select:start', {
    uuids: [],
    mode: 'mouse',
  })
  shouldRender.value = true
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
