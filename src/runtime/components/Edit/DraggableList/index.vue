<template>
  <Sortli
    use-selection
    class="bk-draggable-list-container"
    :class="{ 'is-empty': !list.length }"
    :data-field-name="fieldConfig.name"
    :data-field-label="fieldConfig.label"
    :data-field-is-nested="isNested"
    :data-host-entity-type="entity.entityTypeId"
    :data-host-entity-uuid="entity.uuid"
    :data-host-entity-bundle="entity.entityBundle"
    :data-field-key="fieldKey"
    :data-field-allowed-bundles="allowedBundles"
    :data-field-cardinality="cardinality"
    @select="onSelect"
    @action="onAction"
  >
    <BlokkliItem
      v-for="(item, i) in list"
      :key="item.item?.uuid"
      :item="item.item"
      :props="item.props"
      :is-editing="true"
      :index="i"
      :data-id="item"
      :parent-type="isNested ? entity?.entityBundle : ''"
      data-editing="true"
      data-element-type="existing"
      :data-sortli-id="item.item?.uuid"
      :data-uuid="item.item?.uuid"
      :data-action-key="fieldName + ':' + item.item?.uuid"
      :data-host-type="entity?.entityTypeId"
      :data-host-bundle="entity?.entityBundle"
      :data-host-uuid="entity?.uuid"
      :data-item-bundle="item.item?.entityBundle"
      :data-host-field-name="fieldName"
      :data-is-nested="isNested"
      :data-is-new="item.item.isNew"
      :data-refresh-key="state.refreshKey.value"
      :data-is-selected="selection.uuids.value.includes(item.item?.uuid)"
      class="draggable"
    />
  </Sortli>
</template>

<script lang="ts">
export default {
  name: 'BlokkliDraggableList',
}
</script>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Sortli } from '#blokkli/components'
import type {
  BlokkliFieldListConfig,
  BlokkliFieldList,
  BlokkliFieldListEntity,
} from '#blokkli/types'

const { state, eventBus, types, dom, keyboard, selection } = useBlokkli()

const props = defineProps<{
  list: BlokkliFieldList<any>[]
  entity: BlokkliFieldListEntity
  fieldConfig: BlokkliFieldListConfig
  tag?: string
  isNested: boolean
}>()

const fieldKey = computed(() => {
  if (props.fieldConfig.name && props.entity.uuid) {
    return `${props.entity.uuid}:${props.fieldConfig.name}`
  }
})

const cardinality = computed<number>(() => {
  if (props.fieldConfig && 'storage' in props.fieldConfig) {
    if (typeof props.fieldConfig.storage?.cardinality === 'number') {
      return props.fieldConfig.storage?.cardinality
    }
  }
  return -1
})

/**
 * The allowed item bundles in this list.
 */
const allowedBundles = computed<string>(() => {
  return (
    types.allowedTypes.value.find((v) => {
      return (
        v.entityType === props.entity.entityTypeId &&
        v.bundle === props.entity.entityBundle &&
        v.fieldName === props.fieldConfig.name
      )
    })?.allowedTypes || []
  ).join(',')
})

const fieldName = computed(() => {
  return props.fieldConfig.name || ''
})

function onSelect(uuid: string) {
  const item = dom.findBlock(uuid)
  if (!item) {
    return
  }
  if (keyboard.isPressingControl.value) {
    eventBus.emit('select:toggle', uuid)
  } else {
    eventBus.emit('select', uuid)
  }
}

function onAction(uuid: string) {
  const item = dom.findBlock(uuid)
  if (!item) {
    return
  }
  eventBus.emit('item:edit', {
    uuid: item.uuid,
    bundle: item.itemBundle,
  })
}
</script>
