<template>
  <Teleport v-if="shouldRender" :key="renderKey" to="#blokkli-add-list-actions">
    <AddListItem
      :id="type"
      :label="title"
      :icon="icon"
      :orientation="ui.addListOrientation.value"
      :color="color"
      data-element-type="action"
      :data-action-type="type"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, nextTick, ref } from '#imports'
import type { BlokkliIcon } from '#blokkli/icons'
import type { ActionPlacedEvent } from '#blokkli/types'
import { AddListItem } from '#blokkli/components'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

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

const { ui, state, features } = useBlokkli()

const addListAvailable = computed(
  () => !!features.features.value.find((v) => v.id === 'add-list'),
)

const shouldRender = computed(
  () => addListAvailable.value && state.editMode.value === 'editing',
)

const renderKey = ref('')

onBlokkliEvent('add-list:change', () => {
  nextTick(() => {
    renderKey.value = Math.round(Math.random() * 1000000000).toString()
  })
})

onBlokkliEvent('action:placed', (e) => {
  if (e.action.actionType !== props.type) {
    return
  }

  emit('placed', e)
})
</script>

<script lang="ts">
export default {
  name: 'PluginAddAction',
}
</script>
