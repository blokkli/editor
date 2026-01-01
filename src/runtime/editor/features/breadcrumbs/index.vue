<template>
  <Teleport v-if="ui.mainLayoutElement.value" :to="ui.mainLayoutElement.value">
    <div class="bk bk-breadcrumbs">
      <ul>
        <li>
          <button
            type="button"
            class="bk-breadcrumb-inner"
            @click.prevent="onClickRoot"
          >
            <Icon name="artboard" />
          </button>
        </li>
        <li v-if="selection.hasHostSelected.value || crumbs.length">
          <button
            type="button"
            class="bk-breadcrumb-inner bk-is-host bk-is-text"
            @click.prevent="onClickHost"
          >
            <span>{{ hostLabel }}</span>
          </button>
        </li>
        <li v-for="(crumb, index) in crumbs" :key="crumb.type + index">
          <button
            v-if="crumb.type === 'block'"
            type="button"
            class="bk-breadcrumb-inner bk-is-text"
            @click.prevent="onClickCrumb(crumb)"
          >
            <span>{{ crumb.label }}</span>
          </button>
          <span
            v-else-if="crumb.type === 'multiple'"
            class="bk-breadcrumb-inner"
          >
            {{ crumb.count }} {{ $t('multipleItemsLabel', 'Items') }}
          </span>
          <button
            v-else-if="crumb.type === 'field'"
            type="button"
            class="bk-breadcrumb-inner bk-is-field"
            @click.prevent="onClickField(crumb)"
          >
            <span>{{ crumb.label }}</span>
          </button>
        </li>
        <li v-if="selection.activeEditableLabel.value">
          <div class="bk-breadcrumb-inner bk-is-editable">
            <span>{{ selection.activeEditableLabel.value }}</span>
          </div>
        </li>
      </ul>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, computed } from '#imports'
import { Icon } from '#blokkli/editor/components'
import { useStateBasedCache } from '#blokkli/editor/composables'
import { fragmentBlockBundle, fromLibraryBlockBundle } from '#blokkli-build/config';

defineBlokkliFeature({
  id: 'breadcrumbs',
  label: 'Breadcrumbs',
  icon: 'bk_mdi_bakery_dining',
  description: 'Provides a breadcrumb of the selection.',
  viewports: ['desktop'],
})

const { $t, ui, selection, state, types, definitions, eventBus, context } =
  useBlokkli()

type CrumbField = {
  type: 'field'
  label: string
  entityUuid: string
  fieldName: string
}

type CrumbBlock = {
  type: 'block'
  label: string
  uuid: string
}

type CrumbMultiple = {
  type: 'multiple'
  count: number
}

type Crumb = CrumbField | CrumbBlock | CrumbMultiple

// Cache stores the full chain including field crumbs.
const getChainCache = useStateBasedCache(
  () => new Map<string, Array<CrumbField | CrumbBlock>>(),
)

function getBlockLabel(bundle: string, props?: Record<string, any>): string {
  // Fragment: Use fragment definition label.
  if (bundle === fragmentBlockBundle && props?.name) {
    const fragmentDef = definitions.getFragmentDefinition(props.name)
    if (fragmentDef?.label) {
      return fragmentDef.label
    }
  }

  // Reusable block: Use library item label.
  if (bundle === fromLibraryBlockBundle && props?.libraryItem?.label) {
    return props.libraryItem.label
  }

  // Default: Use bundle definition label.
  return types.getBlockBundleDefinition(bundle)?.label || bundle
}

const hostLabel = computed(
  () => state.entity.value.bundleLabel || state.entity.value.label || 'Host',
)

function getFieldLabel(
  entityType: string,
  entityBundle: string,
  fieldName: string,
): string {
  return (
    types.getFieldConfig(entityType, entityBundle, fieldName)?.label ||
    fieldName
  )
}

function getBlockCrumbs(
  uuid: string,
  bundle: string,
): Array<CrumbField | CrumbBlock> {
  const cache = getChainCache()
  const cached = cache.get(uuid)
  if (cached) {
    return cached
  }

  // Get the field this block is in.
  const field = state.getFieldListForBlock(uuid)
  if (!field) {
    return []
  }

  // Build crumb for this block.
  const item = state.getFieldListItem(uuid)
  const blockCrumb: CrumbBlock = {
    type: 'block',
    label: getBlockLabel(bundle, item?.props),
    uuid,
  }

  // Get parent's chain from cache (or build it recursively).
  const parentUuid = state.getParentEntityUuid(uuid)
  const parentItem = parentUuid ? state.getFieldListItem(parentUuid) : null

  // Determine the entity bundle for field config lookup.
  const entityBundle = parentItem
    ? parentItem.bundle
    : context.value.entityBundle

  // Build field crumb.
  const fieldCrumb: CrumbField = {
    type: 'field',
    label: getFieldLabel(field.entityType, entityBundle, field.name),
    entityUuid: field.entityUuid,
    fieldName: field.name,
  }

  let result: Array<CrumbField | CrumbBlock>
  if (parentItem) {
    // Parent exists: get its full chain and append field + block crumbs.
    const parentChain = getBlockCrumbs(parentItem.uuid, parentItem.bundle)
    result = [...parentChain, fieldCrumb, blockCrumb]
  } else {
    // No parent block: this is a root-level block.
    result = [fieldCrumb, blockCrumb]
  }

  cache.set(uuid, result)
  return result
}

function getCommonFieldKey(items: typeof selection.items.value): string | null {
  if (items.length < 2) {
    return null
  }

  const firstItem = items[0]
  if (!firstItem) {
    return null
  }

  const firstFieldKey = state.getFieldKeyForUuid(firstItem.uuid)
  if (!firstFieldKey) {
    return null
  }

  // Check if all items are in the same field.
  for (let i = 1; i < items.length; i++) {
    const item = items[i]
    if (!item) {
      return null
    }
    const fieldKey = state.getFieldKeyForUuid(item.uuid)
    if (fieldKey !== firstFieldKey) {
      return null
    }
  }

  return firstFieldKey
}

function buildCrumbs(
  hasHostSelected: boolean,
  selectedUuid: string | null,
  selectedBundle: string | null,
  multipleCount: number,
  commonFieldKey: string | null,
): Crumb[] {
  if (hasHostSelected) {
    return []
  }

  // Multiple blocks in the same field: show full parent chain + field + "n Items".
  if (multipleCount > 1 && commonFieldKey && selectedUuid && selectedBundle) {
    const blockCrumbs = getBlockCrumbs(selectedUuid, selectedBundle)
    // Remove the last crumb (the block itself).
    const parentChain = blockCrumbs.slice(0, -1)

    // Check if all blocks in the field are selected.
    const fieldBlockCount = state.getFieldBlockCount(commonFieldKey)
    if (fieldBlockCount === multipleCount) {
      // All blocks selected: just show the field as the last item.
      return parentChain
    }

    return [...parentChain, { type: 'multiple', count: multipleCount }]
  }

  // Multiple blocks in different fields: just show count.
  if (multipleCount > 1) {
    return [{ type: 'multiple', count: multipleCount }]
  }

  if (selectedUuid && selectedBundle) {
    return getBlockCrumbs(selectedUuid, selectedBundle)
  }

  return []
}

const crumbs = computed<Crumb[]>(() =>
  buildCrumbs(
    selection.hasHostSelected.value,
    selection.items.value[0]?.uuid ?? null,
    selection.items.value[0]?.bundle ?? null,
    selection.items.value.length,
    getCommonFieldKey(selection.items.value),
  ),
)

function onClickCrumb(crumb: CrumbBlock) {
  eventBus.emit('select', crumb.uuid)
  eventBus.emit('scrollIntoView', { uuid: crumb.uuid })
}

function onClickField(crumb: CrumbField) {
  const field = state.getMutatedField(crumb.entityUuid, crumb.fieldName)
  if (!field || !field.list.length) {
    return
  }

  const uuids = field.list.map((item) => item.uuid)
  eventBus.emit('select', uuids)
}

function onClickHost() {
  eventBus.emit('select:unselect')
  eventBus.emit('select:host')
}

function onClickRoot() {
  eventBus.emit('select:unselect')
  eventBus.emit('select:host:unselect')
}
</script>

<script lang="ts">
export default {
  name: 'Breadcrumbs',
}
</script>
