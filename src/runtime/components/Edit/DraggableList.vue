<template>
  <Component
    :is="tag"
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
    :data-allowed-fragments="
      allowedFragments ? allowedFragments.join(',') : undefined
    "
    :data-field-allowed-bundles="allowedBundles"
    :data-field-list-type="fieldListType"
    :data-field-cardinality="fieldConfig?.cardinality"
  >
    <BlokkliItem
      v-for="(item, i) in list"
      :key="item.uuid + fieldListType"
      :uuid="item.uuid"
      :bundle="item.bundle"
      :is-new="item.isNew"
      :options="item.options"
      :props="item.props"
      is-editing
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
      :data-host-field-list-type="fieldListType"
      :data-is-nested="isNested"
      :data-is-new="item.isNew"
      :data-entity-type="runtimeConfig.itemEntityType"
    />
  </Component>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, ref, onMounted, onBeforeUnmount } from '#imports'
import type { FieldListItem, EntityContext, FieldConfig } from '#blokkli/types'
import type { BlokkliFragmentName } from '#blokkli/definitions'
import BlokkliItem from './../BlokkliItem.vue'

const { dom, types, runtimeConfig } = useBlokkli()

const root = ref<HTMLElement | null>(null)

const props = defineProps<{
  name: string
  fieldKey: string
  list: FieldListItem[]
  entity: EntityContext
  tag?: string
  isNested: boolean
  fieldListType: string
  allowedFragments?: BlokkliFragmentName[]
  dropAlignment?: 'vertical' | 'horizontal'
}>()

const fieldConfig = computed<FieldConfig>(() => {
  const match = types.getFieldConfig(
    props.entity.type,
    props.entity.bundle,
    props.name,
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
