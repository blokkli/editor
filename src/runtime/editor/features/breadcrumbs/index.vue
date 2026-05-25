<template>
  <Teleport v-if="ui.mainLayoutElement.value" :to="ui.mainLayoutElement.value">
    <div
      v-show="!ui.isApproving.value"
      class="bk bk-breadcrumbs bg-mono-900 pointer-events-auto h-50 border-r border-r-mono-700 overflow-hidden"
    >
      <ul class="flex items-center gap-1 h-full min-w-0">
        <!-- Artboard root. -->
        <Crumb is-first test-id="root" :is-last="rootIsLast">
          <button
            type="button"
            class="group flex items-center h-full px-10 relative hover:text-white"
            :class="rootIsLast ? 'font-bold text-white' : 'font-medium text-mono-300'"
            @click.prevent="onClickRoot"
          >
            <Icon name="artboard" class="size-20 shrink-0" />
          </button>
        </Crumb>

        <!-- Host entity. -->
        <Crumb v-if="showHost" shrinkable test-id="host" :is-last="hostIsLast">
          <button
            type="button"
            class="group flex items-center h-full px-10 relative hover:text-white min-w-0"
            :class="hostIsLast ? 'font-bold text-white' : 'font-medium text-mono-300'"
            @click.prevent="onClickHost"
          >
            <span
              class="whitespace-nowrap overflow-hidden text-ellipsis leading-[24px] group-hover:underline group-hover:underline-offset-4"
            >
              {{ hostLabel }}
            </span>
          </button>
        </Crumb>

        <!-- Block / field / multiple chain. -->
        <Crumb
          v-for="(crumb, index) in crumbs"
          :key="crumb.type + index"
          :crumb
          :is-last="index === crumbs.length - 1 && !hasEditable"
        />

        <!-- Active editable field (always the last crumb). -->
        <Crumb v-if="hasEditable" is-last test-id="editable">
          <div
            class="flex items-center h-full px-10 relative uppercase text-xs tracking-wide min-w-0 font-bold text-white"
          >
            <span
              class="whitespace-nowrap overflow-hidden text-ellipsis px-[8px] pt-[4px] pb-2 border bg-teal-normal text-teal-dark border-teal-normal"
            >
              {{ selection.activeFieldLabel.value }}
            </span>
          </div>
        </Crumb>
      </ul>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, computed } from '#imports'
import { Icon } from '#blokkli/editor/components'
import { useStateBasedCache } from '#blokkli/editor/composables'
import {
  fragmentBlockBundle,
  fromLibraryBlockBundle,
} from '#blokkli-build/config'
import Crumb from './Crumb/index.vue'
import type { Crumb as CrumbType, CrumbBlock, CrumbField } from './types'

defineBlokkliFeature({
  id: 'breadcrumbs',
  label: 'Breadcrumbs',
  icon: 'bk_mdi_bakery_dining',
  description: 'Provides a breadcrumb of the selection.',
  viewports: ['desktop'],
})

const { ui, selection, state, types, definitions, eventBus, context } =
  useBlokkli()

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
): CrumbType[] {
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

const crumbs = computed<CrumbType[]>(() =>
  buildCrumbs(
    selection.hasHostSelected.value,
    selection.items.value[0]?.uuid ?? null,
    selection.items.value[0]?.bundle ?? null,
    selection.items.value.length,
    getCommonFieldKey(selection.items.value),
  ),
)

// The host crumb shows whenever a block (→ has crumbs) or the host itself is
// selected. The editable field, when open, is always the final crumb — which
// makes the root/host "current" only when nothing follows them.
const hasEditable = computed(() => !!selection.activeFieldLabel.value)
const showHost = computed(
  () => selection.hasHostSelected.value || crumbs.value.length > 0,
)
const rootIsLast = computed(() => !showHost.value && !hasEditable.value)
const hostIsLast = computed(
  () => crumbs.value.length === 0 && !hasEditable.value,
)

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

<style lang="postcss">
.bk.bk-breadcrumbs {
  /* Placed by the editor's main layout grid; no utility for a named area. */
  grid-area: breadcrumbs;
}
</style>
