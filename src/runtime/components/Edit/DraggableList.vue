<template>
  <div
    v-if="proxyMode"
    ref="root"
    class="bk-field-list-proxy"
    v-bind="fieldAttributes"
  >
    <BlokkliItem
      v-for="(item, i) in list"
      :key="item.uuid + fieldListType + i"
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
      :data-bk-is-muted="isMuted(item)"
    />
  </div>
  <Component
    v-else
    :is="tag"
    ref="root"
    :class="['bk-draggable-list-container', attrs.class]"
    v-bind="fieldAttributes"
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
      :data-bk-is-muted="isMuted(item)"
    />
  </Component>
</template>

<script lang="ts" setup>
import {
  computed,
  useBlokkli,
  ref,
  onMounted,
  onBeforeUnmount,
  useAttrs,
  provide,
} from '#imports'
import type { FieldListItem, EntityContext, FieldConfig } from '#blokkli/types'
import type { BlokkliFragmentName } from '#blokkli/definitions'
import BlokkliItem from './../BlokkliItem.vue'
import { isVisibleByOptions } from '#blokkli/helpers/runtimeHelpers'
import {
  INJECT_FIELD_PROXY_MODE,
  INJECT_IS_EDITING,
} from '#blokkli/helpers/symbols'

const { dom, types, runtimeConfig } = useBlokkli()

const root = ref<HTMLElement | null>(null)

const props = defineProps<{
  name: string
  fieldKey: string
  list: FieldListItem[]
  entity: EntityContext
  language: string
  tag?: string
  isNested: boolean
  fieldListType: string
  allowedFragments?: BlokkliFragmentName[]
  dropAlignment?: 'vertical' | 'horizontal'
  proxyMode?: boolean
}>()

const attrs = useAttrs()

provide(INJECT_FIELD_PROXY_MODE, props.proxyMode)
provide(INJECT_IS_EDITING, true)

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

const fieldAttributes = computed(() => {
  return {
    'data-field-name': props.name,
    'data-field-label': fieldConfig.value.label,
    'data-field-is-nested': props.isNested,
    'data-host-entity-type': props.entity.type,
    'data-host-entity-uuid': props.entity.uuid,
    'data-host-entity-bundle': props.entity.bundle,
    'data-field-key': props.fieldKey,
    'data-field-drop-alignment': props.dropAlignment,
    'data-allowed-fragments': props.allowedFragments
      ? props.allowedFragments.join(',')
      : undefined,
    'data-field-allowed-bundles': allowedBundles.value,
    'data-field-list-type': props.fieldListType,
    'data-field-cardinality': fieldConfig.value.cardinality,
  }
})

// @TODO: This should be handled differently to prevent constant updates in the
// component when the options change.
// Ideally this is handled as an overlay on top of the blocks, similar to how
// selection or multi-select works.
function isMuted(item?: FieldListItem) {
  return !isVisibleByOptions(item, props.language)
}

onMounted(() => {
  if (root.value) {
    dom.registerField(props.entity.uuid, props.name, root.value)
  }
})

onBeforeUnmount(() => {
  dom.unregisterField(props.entity.uuid, props.name)
})

defineOptions({
  inheritAttrs: false,
})
</script>
