<template>
  <div
    ref="root"
    class="bk-draggable-list-container"
    :data-field-name="name"
    :data-field-label="fieldConfig?.label"
    :data-field-is-nested="isNested"
    :data-host-entity-type="entity.type"
    :data-host-entity-uuid="entity.uuid"
    :data-host-entity-bundle="entity.bundle"
    :data-field-key="fieldKey"
    :data-field-drop-alignment="dropAlignment"
    :data-allowed-fragments="allowedFragments.join(',')"
    :data-field-allowed-bundles="allowedBundles"
    :data-field-cardinality="fieldConfig?.cardinality"
  >
    <BlokkliItemDynamic
      v-for="(item, i) in list"
      :key="item.uuid"
      :uuid="item.uuid"
      :bundle="item.bundle"
      :is-new="item.isNew"
      :options="item.options"
      :props="item.props"
      :is-editing="true"
      :index="i"
      :parent-type="isNested ? entity.bundle : ''"
      data-editing="true"
      data-element-type="existing"
      :data-sortli-id="item.uuid"
      :data-uuid="item.uuid"
      :data-host-type="entity.type"
      :data-host-bundle="entity.bundle"
      :data-host-uuid="entity.uuid"
      :data-item-bundle="item.bundle"
      :data-host-field-name="name"
      :data-is-nested="isNested"
      :data-is-new="item.isNew"
      :data-entity-type="runtimeConfig.itemEntityType"
      class="bk-draggable"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, ref, onMounted, onBeforeUnmount } from '#imports'
import type { FieldListItem, EntityContext, FieldConfig } from '#blokkli/types'
import type { BlokkliFragmentName } from '#blokkli/definitions'
import BlokkliItemDynamic from '#blokkli/blokkli-item-component'

const { dom, types, runtimeConfig } = useBlokkli()

const root = ref<HTMLElement | null>(null)

const props = defineProps<{
  name: string
  fieldKey: string
  list: FieldListItem[]
  entity: EntityContext
  tag?: string
  isNested: boolean
  allowedFragments: BlokkliFragmentName[]
  dropAlignment?: 'vertical' | 'horizontal'
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

onMounted(() => {
  if (root.value) {
    dom.registerField(props.entity.uuid, props.name, root.value)
  }
})

onBeforeUnmount(() => {
  dom.unregisterField(props.entity.uuid, props.name)
})
</script>
