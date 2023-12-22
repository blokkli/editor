<template>
  <Teleport to="#blokkli-add-list-actions">
    <button
      key="assistant"
      class="bk-list-item bk-clone"
      :class="'bk-is-' + color"
      data-element-type="action"
      :data-action-type="type"
      :data-sortli-id="type"
    >
      <div class="bk-list-item-inner">
        <div class="bk-list-item-icon">
          <Icon :name="icon" />
          <div class="bk-add-list-drop bk-drop-element">
            <Icon :name="icon" />
            <span>{{ title }}</span>
          </div>
        </div>
        <div
          class="bk-list-item-label"
          :class="{
            'bk-tooltip':
              listOrientation === 'horizontal' && !ui.isMobile.value,
          }"
        >
          <span>{{ title }}</span>
        </div>
      </div>
    </button>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'
import type { BlokkliIcon } from '#blokkli/icons'
import type { ActionPlacedEvent, AddListOrientation } from '#blokkli/types'
import { Icon } from '#blokkli/components'

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

const { ui, storage, eventBus } = useBlokkli()

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

onMounted(() => {
  eventBus.on('action:placed', onActionPlaced)
})

onBeforeUnmount(() => {
  eventBus.off('action:placed', onActionPlaced)
})
</script>

<script lang="ts">
export default {
  name: 'PluginAddAction',
}
</script>
