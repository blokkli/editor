<template>
  <Teleport v-if="shouldRender" :key="renderKey" to="#blokkli-add-list-actions">
    <AddListItem
      :id="type"
      ref="item"
      :label="title"
      :icon="icon"
      :orientation="ui.addListOrientation.value"
      :color="color"
      data-element-type="action"
      :data-action-type="type"
      no-context-menu
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, nextTick, ref } from '#imports'
import type { BlokkliIcon } from '#blokkli/icons'
import type { ActionPlacedEvent } from '#blokkli/types'
import { AddListItem } from '#blokkli/components'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import defineTourItem from '#blokkli/helpers/composables/defineTourItem'

const props = defineProps<{
  type: string
  title: string
  icon: BlokkliIcon
  color: 'rose' | 'lime' | 'accent'
  description?: string
  disabled?: boolean
  weight?: number
}>()

const item = ref<InstanceType<typeof AddListItem> | null>(null)

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

defineTourItem(() => {
  return {
    id: 'plugin:add_action:' + props.type,
    title: props.title,
    text: props.description,
    element: () => item.value?.getElement(),
  }
})
</script>

<script lang="ts">
export default {
  name: 'PluginAddAction',
}
</script>
