<template>
  <Sortli
    use-selection
    class="bk-draggable-list-container"
    :class="{ 'is-empty': !list.length }"
    :data-field-name="name"
    :data-field-label="fieldConfig?.label"
    :data-field-is-nested="isNested"
    :data-host-entity-type="entity.type"
    :data-host-entity-uuid="entity.uuid"
    :data-host-entity-bundle="entity.bundle"
    :data-field-key="fieldKey"
    :data-allowed-fragments="allowedFragments.join(',')"
    :data-field-allowed-bundles="allowedBundles"
    :data-field-cardinality="fieldConfig?.cardinality"
    @select="onSelect"
    @action="onAction"
  >
    <BlokkliItem
      v-for="(item, i) in renderList"
      :key="item.uuid"
      :uuid="item.uuid"
      :bundle="item.bundle"
      :is-new="item.isNew"
      :options="item.options"
      :props="item.props"
      :is-editing="true"
      :index="i"
      :data-id="item"
      :parent-type="isNested ? entity.bundle : ''"
      data-editing="true"
      data-element-type="existing"
      :data-sortli-id="item.uuid"
      :data-uuid="item.uuid"
      :data-action-key="name + ':' + item.uuid"
      :data-host-type="entity.type"
      :data-host-bundle="entity.bundle"
      :data-host-uuid="entity.uuid"
      :data-item-bundle="item.bundle"
      :data-host-field-name="name"
      :data-is-nested="isNested"
      :data-is-new="item.isNew"
      :data-is-selected="item.selected"
      :data-refresh-key="state.refreshKey.value"
      :data-entity-type="runtimeConfig.itemEntityType"
      :class="{ 'bk-is-selected': item.selected }"
      class="bk-draggable"
    />
  </Sortli>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Sortli } from '#blokkli/components'
import type { FieldListItem, EntityContext, FieldConfig } from '#blokkli/types'
import type { BlokkliFragmentName } from '#blokkli/definitions'

const { state, eventBus, dom, keyboard, selection, types, runtimeConfig } =
  useBlokkli()

const props = defineProps<{
  name: string
  fieldKey: string
  list: FieldListItem[]
  entity: EntityContext
  tag?: string
  isNested: boolean
  allowedFragments: BlokkliFragmentName[]
}>()

const fieldConfig = computed<FieldConfig>(() => {
  const match = types.fieldConfig.value.find(
    (v) =>
      v.name === props.name &&
      v.entityType === props.entity.type &&
      v.entityBundle === props.entity.bundle,
  )

  if (!match) {
    throw new Error(
      `Missing field configuration for field "${props.name}" on entity type "${props.entity.type}" with bundle "${props.entity.bundle}". Make sure the "name" prop passed to <BlokkliField> is correct.`,
    )
  }

  return match
})

type RenderedListItem = FieldListItem & { selected: boolean }

const renderList = computed<RenderedListItem[]>(() => {
  return props.list.map((item) => {
    return {
      ...item,
      selected: selection.uuids.value.includes(item.uuid),
    }
  })
})

/**
 * The allowed item bundles in this list.
 */
const allowedBundles = computed<string>(() => {
  const bundles = fieldConfig.value.allowedBundles
  if (!bundles.length) {
    console.error(
      `Field with name "${props.name}" on entity "${props.entity.type}" with bundle "${props.entity.bundle}" does not define any allowed bundles.`,
    )
  }

  return bundles.join(',')
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
