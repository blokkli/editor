<template>
  <Teleport v-if="shouldRender" to="#blokkli-add-list-actions">
    <AddListItem
      :id="type"
      ref="item"
      :label="title"
      :icon="icon"
      :color="color"
      :disabled="disabled"
      data-element-type="action"
      :data-action-type="type"
      :data-item-bundle="itemBundle"
      no-context-menu
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, ref, onMounted, onBeforeUnmount } from '#imports'
import type { BlokkliIcon } from '#blokkli-build/icons'
import type { ActionPlacedEvent, AddAction } from '#blokkli/types'
import { AddListItem } from '#blokkli/components'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import defineTourItem from '#blokkli/helpers/composables/defineTourItem'

const props = defineProps<{
  type: string
  title: string
  icon: BlokkliIcon
  itemBundle?: string
  color: 'rose' | 'lime' | 'accent'
  description?: string
  disabled?: boolean
  weight?: number
}>()

const item = ref<InstanceType<typeof AddListItem> | null>(null)

const emit = defineEmits<{
  (e: 'placed', data: ActionPlacedEvent): void
}>()

const { state, features, plugins } = useBlokkli()

const addListAvailable = computed(
  () => !!features.mountedFeatures.value.find((v) => v.id === 'add-list'),
)

const shouldRender = computed(
  () => addListAvailable.value && state.editMode.value === 'editing',
)

onBlokkliEvent('action:placed', (e) => {
  if (e.id !== props.type) {
    return
  }

  emit('placed', e)
})

defineTourItem(() => {
  if (!props.description) {
    return
  }
  return {
    id: 'plugin:add_action:' + props.type,
    title: props.title,
    text: props.description,
    element: () => item.value?.getElement(),
  }
})

function addActionFunction(): AddAction {
  return {
    id: props.type,
    icon: props.icon,
    color: props.color,
    itemBundle: props.itemBundle,
    title: props.title,
    description: props.description,
    enabled: !props.disabled,
  }
}

onMounted(() => {
  plugins.addAddAction(addActionFunction)
})

onBeforeUnmount(() => {
  plugins.removeAddAction(addActionFunction)
})
</script>

<script lang="ts">
export default {
  name: 'PluginAddAction',
}
</script>
