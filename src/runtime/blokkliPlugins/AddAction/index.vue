<template>
  <Teleport v-if="shouldRender" :key="renderKey" to="#blokkli-add-list-actions">
    <AddListItem
      :id="type"
      :label="title"
      :icon="icon"
      :orientation="listOrientation"
      :color="color"
      data-element-type="action"
      :data-action-type="type"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'
import type { BlokkliIcon } from '#blokkli/icons'
import type { ActionPlacedEvent, AddListOrientation } from '#blokkli/types'
import { AddListItem } from '#blokkli/components'

const props = defineProps<{
  type: string
  title: string
  icon: BlokkliIcon
  color: 'rose' | 'lime'
  description?: string
  disabled?: boolean
  weight?: number
}>()

const emit = defineEmits<{
  (e: 'placed', data: ActionPlacedEvent): void
}>()

const { ui, storage, eventBus, state } = useBlokkli()

const shouldRender = computed(() => state.editMode.value === 'editing')

const listOrientationSetting = storage.use<AddListOrientation>(
  'listOrientation',
  'vertical',
)

const listOrientation = computed<AddListOrientation>(() =>
  ui.isMobile.value ? 'horizontal' : listOrientationSetting.value,
)

const onActionPlaced = (e: ActionPlacedEvent) => {
  if (e.action.actionType !== props.type) {
    return
  }

  emit('placed', e)
}

const renderKey = ref('')

const onAddListChange = () => {
  renderKey.value = Math.round(Math.random() * 1000000000).toString()
}

onMounted(() => {
  eventBus.on('action:placed', onActionPlaced)
  eventBus.on('add-list:change', onAddListChange)
})

onBeforeUnmount(() => {
  eventBus.off('action:placed', onActionPlaced)
  eventBus.off('add-list:change', onAddListChange)
})
</script>

<script lang="ts">
export default {
  name: 'PluginAddAction',
}
</script>
