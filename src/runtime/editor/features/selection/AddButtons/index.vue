<template>
  <Teleport to="#bk-canvas-overlay">
    <BlokkliTransition name="caret-tooltip">
      <BundleSelector
        v-if="addData"
        :key="addData.target.id"
        :bundles="addData.target.bundles"
        :anchor-coordinates="addData.anchor"
        :label="addData.label"
        :field="addData.target.field"
        @select="onSelectBundle"
        @close="closeOverlay"
        @action="onSelectAction"
        @fragment="onSelectFragment"
      />
    </BlokkliTransition>
  </Teleport>

  <ErrorBoundary v-model="isLocked" label="Add Buttons">
    <Renderer
      v-if="!isLocked"
      :key="animation.renderKey.value"
      :targets
      :pager-targets
      :active-target-id="addData?.target.id ?? null"
      @activate="activate"
    />
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { computed, useBlokkli, ref, watch } from '#imports'
import {
  BlokkliTransition,
  ErrorBoundary,
  BundleSelector,
} from '#blokkli/editor/components'
import {
  getChildrenFlow,
  getFieldAddBundles,
} from '#blokkli/editor/helpers/dropTargets'
import { isInternalBundle } from '#blokkli/editor/helpers/bundles'
import Renderer from './Renderer/index.vue'
import { itemEntityType } from '#blokkli-build/config'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import type { AddAction } from '#blokkli/editor/types/actions'
import type {
  BlokkliFieldElement,
  BlokkliItemHost,
  RenderedFieldListItem,
} from '#blokkli/editor/types/field'
import type { Coord } from '#blokkli/editor/types/geometry'
import type { EntityContext } from '#blokkli/types'
import { HORIZONTAL_ELLIPSIS } from '#blokkli/editor/helpers/string'
import type {
  AddTarget,
  AddTargetId,
  AddTargets,
  FieldAddTarget,
  SiblingAddTarget,
} from './types'

const props = defineProps<{
  items: RenderedFieldListItem[]
}>()

const {
  dom,
  state,
  eventBus,
  types,
  $t,
  fields,
  animation,
  context,
  selection,
  permissions,
  adapter,
} = useBlokkli()

const isLocked = ref(false)

const maxNestingLevel = adapter.getMaxNestingLevel?.()

// Responsive layouts and options change how a field lays out its blocks.
const layoutKey = ref(0)
onBlokkliEvent('ui:resized', () => layoutKey.value++)
onBlokkliEvent('option:finish-change', () => layoutKey.value++)

function getBundleLabel(bundle: string): string {
  return types.getBlockBundleDefinition(bundle)?.label || bundle
}

/**
 * The bundles the user may add to the field, which holds `count` blocks:
 * none when it can't take another one.
 */
function getAddBundles(
  field: BlokkliFieldElement,
  count: number,
  canChange: boolean,
): string[] {
  return getFieldAddBundles(field, count, {
    canChange,
    maxNestingLevel,
    isBundlePermitted: (bundle) =>
      permissions.checkBlockBundlePermission(bundle, 'add'),
  })
}

/**
 * The bundle to add without the bundle selector: the only one the user may
 * add. An internal bundle (from library, fragment) needs the selector.
 */
function getDirectBundle(bundles: string[]): string | null {
  const bundle = bundles.length === 1 ? bundles[0] : undefined
  return bundle && !isInternalBundle(bundle) ? bundle : null
}

function getSiblingLabel(
  kind: 'before' | 'after',
  directBundle: string | null,
): string {
  const bundleLabel = directBundle ? getBundleLabel(directBundle) : null
  if (kind === 'before') {
    return bundleLabel
      ? $t('addButtonBundleBefore', 'Add "@bundle" before').replace(
          '@bundle',
          bundleLabel,
        )
      : $t('addButtonBeforeBundle', 'Add before', { more: true })
  }
  return bundleLabel
    ? $t('addButtonBundleAfter', 'Add "@bundle" after').replace(
        '@bundle',
        bundleLabel,
      )
    : $t('addButtonAfterBundle', 'Add after', { more: true })
}

/**
 * The label of a field's button. The parent label is the label of the block
 * the field belongs to, or null for a field of the host.
 */
function getFieldLabel(
  fieldLabel: string,
  parentLabel: string | null,
  directBundle: string | null,
): string {
  const bundleLabel = directBundle ? getBundleLabel(directBundle) : null

  if (parentLabel === null) {
    return bundleLabel
      ? $t('addButtonBundleToField', 'Add "@bundle" to @fieldLabel')
          .replace('@bundle', bundleLabel)
          .replace('@fieldLabel', fieldLabel)
      : $t('addButtonToField', 'Add to @fieldLabel', { more: true }).replace(
          '@fieldLabel',
          fieldLabel,
        )
  }

  return bundleLabel
    ? $t(
        'addButtonBundleInsideField',
        'Add "@bundle" inside @parentBundle » @fieldLabel',
      )
        .replace('@bundle', bundleLabel)
        .replace('@parentBundle', parentLabel)
        .replace('@fieldLabel', fieldLabel)
    : $t('addButtonInsideField', 'Add inside @parentBundle » @fieldLabel', {
        more: true,
      })
        .replace('@parentBundle', parentLabel)
        .replace('@fieldLabel', fieldLabel)
}

function getChildUuids(entityUuid: string, fieldName: string): string[] {
  return (
    state
      .getMutatedField(entityUuid, fieldName)
      ?.list.map((item) => item.uuid) ?? []
  )
}

/**
 * The target at the end of a field, if it can take another block: the user
 * may change it, it's deep enough in the nesting limit, has room and allows a
 * bundle the user may add. The parent label is the label of the block holding
 * the field, or null for a field of the host.
 */
function getFieldTarget(
  field: BlokkliFieldElement,
  id: AddTargetId,
  parentLabel: string | null,
): FieldAddTarget | null {
  const childUuids = getChildUuids(field.hostEntityUuid, field.name)
  const bundles = getAddBundles(
    field,
    childUuids.length,
    permissions.canChangeField(
      {
        type: field.hostEntityType,
        bundle: field.hostEntityBundle,
        uuid: field.hostEntityUuid,
      },
      field.name,
    ),
  )
  if (!bundles.length) {
    return null
  }
  const directBundle = getDirectBundle(bundles)
  return {
    id,
    kind: 'field',
    field,
    label: getFieldLabel(field.label || field.name, parentLabel, directBundle),
    bundles,
    directBundle,
    // Add at the end of the field.
    preceedingUuid: childUuids[childUuids.length - 1] ?? null,
    flow: getChildrenFlow(field.element, field.dropAlignment),
    isEmpty: !childUuids.length,
    childUuids,
  }
}

/**
 * A target for every rendered field of the entity that can take another
 * block. Not for a field in proxy mode: its band offers that, whatever is
 * selected (pagerTargets). The parent label is the label of the block, or null
 * for the host.
 */
function getFieldTargets(
  entity: EntityContext,
  parentLabel: string | null,
): FieldAddTarget[] {
  return types.fieldConfig
    .forEntityTypeAndBundle(entity.type, entity.bundle)
    .flatMap((config): FieldAddTarget[] => {
      const field = fields.find(entity.uuid, config.name)
      if (!field || field.isPager) {
        return []
      }
      const target = getFieldTarget(field, `field:${config.name}`, parentLabel)
      return target ? [target] : []
    })
}

/**
 * A target for every field in proxy mode whose band has room for the button,
 * whatever is selected: at the end of the field.
 */
const pagerTargets = computed<FieldAddTarget[]>(() => {
  // Recompute when the state changed.
  void state.refreshKey.value

  return dom.getAddAreaFieldKeys().flatMap((key): FieldAddTarget[] => {
    const separator = key.indexOf(':')
    const field = fields.find(
      key.substring(0, separator),
      key.substring(separator + 1),
    )
    if (!field) {
      return []
    }
    const target = getFieldTarget(
      field,
      `field:${key}`,
      field.hostEntityType === itemEntityType
        ? getBundleLabel(field.hostEntityBundle)
        : null,
    )
    return target ? [target] : []
  })
})

/**
 * The before/after targets of the selected block, if its field can take
 * another block.
 */
function getSiblingTargets(
  item: RenderedFieldListItem,
  siblingUuids: string[],
): SiblingAddTarget[] {
  const parent = fields.find(item.host.uuid, item.host.fieldName)
  if (!parent) {
    return []
  }
  const bundles = getAddBundles(
    parent,
    siblingUuids.length,
    permissions.canChangeBlockField(item.uuid),
  )
  if (!bundles.length) {
    return []
  }
  const directBundle = getDirectBundle(bundles)
  const flow = getChildrenFlow(parent.element, parent.dropAlignment)
  const index = siblingUuids.indexOf(item.uuid)

  return (['before', 'after'] as const).map((kind) => ({
    id: kind,
    kind,
    field: parent,
    label: getSiblingLabel(kind, directBundle),
    bundles,
    directBundle,
    preceedingUuid:
      kind === 'after' ? item.uuid : (siblingUuids[index - 1] ?? null),
    flow,
  }))
}

const targets = computed<AddTargets | null>(() => {
  // Recompute when the state, the rendered fields or the layout changed.
  void state.refreshKey.value
  void dom.settleKey.value
  void layoutKey.value

  if (selection.hasHostSelected.value) {
    return {
      key: 'host',
      uuid: null,
      siblingUuids: [],
      list: getFieldTargets(
        {
          type: context.value.entityType,
          bundle: context.value.entityBundle,
          uuid: context.value.entityUuid,
        },
        null,
      ),
    }
  }

  const item = props.items.length === 1 ? props.items[0] : undefined
  if (!item) {
    return null
  }

  const siblingUuids = getChildUuids(item.host.uuid, item.host.fieldName)

  return {
    key: item.uuid,
    uuid: item.uuid,
    siblingUuids,
    list: [
      ...getSiblingTargets(item, siblingUuids),
      ...getFieldTargets(
        { type: itemEntityType, bundle: item.bundle, uuid: item.uuid },
        getBundleLabel(item.bundle),
      ),
    ],
  }
})

type AddData = {
  target: AddTarget
  /** In artboard coordinates. */
  anchor: Coord
  label: string
}

const addData = ref<AddData | null>(null)

function closeOverlay() {
  addData.value = null
}

function getHost(field: BlokkliFieldElement): BlokkliItemHost {
  return {
    type: field.hostEntityType,
    uuid: field.hostEntityUuid,
    fieldName: field.name,
  }
}

/**
 * Add a block at a target: right away when there's only one bundle to add,
 * else with the bundle selector. Activating the target of the open selector
 * again closes it.
 */
function activate(e: { id: AddTargetId; anchor: Coord }) {
  if (addData.value?.target.id === e.id) {
    return closeOverlay()
  }

  const target =
    targets.value?.list.find((v) => v.id === e.id) ??
    pagerTargets.value.find((v) => v.id === e.id)
  if (!target) {
    return closeOverlay()
  }

  if (target.directBundle) {
    closeOverlay()
    eventBus.emit('block:append', {
      bundle: target.directBundle,
      host: getHost(target.field),
      afterUuid: target.preceedingUuid,
    })
    return
  }

  addData.value = {
    target,
    anchor: e.anchor,
    label: target.label.replace(HORIZONTAL_ELLIPSIS, ''),
  }
}

function onSelectBundle(bundle: string) {
  if (!addData.value) {
    return
  }

  const { target } = addData.value
  eventBus.emit('block:append', {
    bundle,
    host: getHost(target.field),
    afterUuid: target.preceedingUuid,
  })

  closeOverlay()
}

function onSelectAction(action: AddAction) {
  if (!addData.value) {
    return
  }

  const { target } = addData.value
  action.callback({
    field: target.field,
    preceedingUuid: target.preceedingUuid,
    host: getHost(target.field),
  })
  closeOverlay()
}

async function onSelectFragment(name: string) {
  const fragmentsAddBlock = adapter.fragmentsAddBlock
  if (!addData.value || !fragmentsAddBlock) {
    return
  }

  const { target } = addData.value
  closeOverlay()

  await state.mutateWithLoadingState(() =>
    fragmentsAddBlock({
      name,
      host: getHost(target.field),
      preceedingUuid: target.preceedingUuid,
    }),
  )
}

/**
 * The centre of the block or field of a target, in artboard coordinates.
 */
function getTargetCenter(target: AddTarget): Coord {
  const rect =
    target.kind === 'field'
      ? dom.getFieldRect(target.field.key)
      : targets.value?.uuid
        ? dom.getBlockRect(targets.value.uuid)
        : undefined
  return rect
    ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    : { x: 0, y: 0 }
}

// The selection can change through many events: close the bundle selector
// when it belongs to a selection that's gone.
watch(() => targets.value?.key, closeOverlay)

// The canvas only draws on request, and the bands' buttons come and go without
// a change of the selection.
watch(pagerTargets, () => animation.requestDraw())

onBlokkliEvent('dragging:start', closeOverlay)

onBlokkliEvent('selection:add-button:trigger', (e) => {
  const id: AddTargetId =
    e.position === 'field' ? `field:${e.fieldName}` : e.position

  // Like on the canvas: no target, no button.
  const target = targets.value?.list.find((v) => v.id === id)
  if (!target) {
    return
  }

  activate({ id, anchor: getTargetCenter(target) })
})
</script>
