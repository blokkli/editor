<template>
  <Teleport to="#bk-canvas-overlay">
    <BlokkliTransition name="caret-tooltip">
      <BundleSelector
        v-if="addData"
        :key="addData.key"
        :bundles="addData.allowedBundles"
        :anchor-el="addData.anchorEl"
        :anchor-coordinates="addData.anchorCoordinates"
        :label="addData.label"
        @select="onSelectBundle"
        @close="closeOverlay"
        @action="onSelectAction"
      />
    </BlokkliTransition>
  </Teleport>

  <ErrorBoundary v-model="isLocked" label="Add Buttons">
    <Renderer
      v-if="!isLocked"
      :key="animation.renderKey.value"
      @toggle="onRendererToggle"
      @toggle-field="onRendererToggleField"
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
  getChildrenOrientation,
  getGapSize,
  MIN_GAP,
  type Orientation,
  determineCanAddChildren,
} from '#blokkli/editor/helpers/dropTargets'
import type {
  BlokkliFieldElement,
  DraggableHostData,
  RenderedFieldListItem,
} from '#blokkli/types'
import { renderCycle } from '#blokkli/editor/helpers/vue'
import { getFieldKey } from '#blokkli/helpers'
import { isInternalBundle } from '#blokkli/editor/helpers/bundles'
import Renderer from './Renderer/index.vue'
import { itemEntityType } from '#blokkli-build/config'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import type { AddAction } from '#blokkli/editor/types/actions'

const props = defineProps<{
  items: RenderedFieldListItem[]
}>()

const { dom, state, eventBus, types, $t, blocks, fields, animation } =
  useBlokkli()

const isLocked = ref(false)

const shouldRender = computed(() => {
  // Add buttons are only visible when one block is selected.
  return props.items.length === 1
})

const block = computed<RenderedFieldListItem | null>(() => {
  if (props.items.length === 1) {
    return props.items[0] ?? null
  }
  return null
})

const uuid = computed<string | null>(() => {
  return block.value?.uuid ?? null
})

const emptyBlockFields = computed(() => {
  if (!block.value) {
    return []
  }

  const uuid = block.value.uuid

  return types.fieldConfig
    .forEntityTypeAndBundle(itemEntityType, block.value.bundle)
    .map((field) => {
      const key = getFieldKey(uuid, field.name)
      const count = state.getFieldBlockCount(key)
      return {
        key,
        count,
        name: field.name,
      }
    })
    .filter((v) => {
      return v.count === 0
    })
})

const containerStyle = ref<Record<string, string>>({ visibility: 'hidden' })
const orientationClass = ref<string>('')
const containerRect = ref<{ x: number; y: number } | null>(null)

const fieldButtonSlots = ref<Array<{ fieldKey: string | undefined }>>([])

const bundleLabel = computed(() => {
  if (!block.value) {
    return ''
  }
  return (
    types.getBlockBundleDefinition(block.value.bundle)?.label ||
    block.value.bundle
  )
})

const allowedBundlesForField = computed(() => {
  if (!block.value) {
    return []
  }

  const blockData = blocks.getBlock(block.value.uuid)
  if (!blockData) {
    return []
  }

  const field = fields.find(blockData.host.uuid, blockData.host.fieldName)
  if (!field) {
    return []
  }

  return field.allowedBundles.filter((bundle) => !isInternalBundle(bundle))
})

const singleAllowedBundleLabel = computed(() => {
  if (allowedBundlesForField.value.length === 1) {
    const bundle = allowedBundlesForField.value[0]
    if (bundle) {
      return types.getBlockBundleDefinition(bundle)?.label || bundle
    }
  }
  return null
})

const beforeTooltip = computed(() => {
  if (singleAllowedBundleLabel.value) {
    return $t('addButtonBundleBefore', 'Add "@bundle" before').replace(
      '@bundle',
      singleAllowedBundleLabel.value,
    )
  }
  return $t('addButtonBeforeBundle', 'Add before...')
})

const afterTooltip = computed(() => {
  if (singleAllowedBundleLabel.value) {
    return $t('addButtonBundleAfter', 'Add "@bundle" after').replace(
      '@bundle',
      singleAllowedBundleLabel.value,
    )
  }

  return $t('addButtonAfterBundle', 'Add after...')
})

const fieldTooltips = computed(() => {
  if (!block.value || !bundleLabel.value) {
    return []
  }

  return emptyBlockFields.value.map((field) => {
    const fieldConfig = types.fieldConfig
      .forEntityTypeAndBundle(itemEntityType, block.value!.bundle)
      .find((f) => f.name === field.name)

    const fieldLabel = fieldConfig?.label || field.name

    // Get field element to check allowed bundles
    const fieldElement = fields.find(block.value!.uuid, field.name)
    if (fieldElement) {
      const allowedBundles = fieldElement.allowedBundles.filter(
        (bundle) => !isInternalBundle(bundle),
      )

      if (allowedBundles.length === 1) {
        const bundle = allowedBundles[0]
        if (bundle) {
          const singleBundleLabel =
            types.getBlockBundleDefinition(bundle)?.label || bundle
          return $t(
            'addButtonBundleInsideField',
            'Add "@bundle" inside @parentBundle » @fieldLabel',
          )
            .replace('@bundle', singleBundleLabel)
            .replace('@parentBundle', bundleLabel.value)
            .replace('@fieldLabel', fieldLabel)
        }
      }
    }

    return $t(
      'addButtonInsideField',
      'Add inside @parentBundle » @fieldLabel...',
    )
      .replace('@parentBundle', bundleLabel.value)
      .replace('@fieldLabel', fieldLabel)
  })
})

// Update field button slots when empty fields change
watch(emptyBlockFields, (fields) => {
  const neededCount = fields.length

  // Grow the slots array if needed
  while (fieldButtonSlots.value.length < neededCount) {
    fieldButtonSlots.value.push({ fieldKey: undefined })
  }

  // Update active slots with field keys
  for (let i = 0; i < fieldButtonSlots.value.length; i++) {
    const slot = fieldButtonSlots.value[i]
    if (!slot) {
      continue
    }

    if (i < fields.length) {
      const field = fields[i]
      slot.fieldKey = field?.key
    } else {
      // Hide inactive slots
      slot.fieldKey = undefined
    }
  }
})

type AddData = {
  allowedBundles: string[]
  preceedingUuid: string | null
  host: DraggableHostData
  field: BlokkliFieldElement
  anchorEl?: HTMLElement
  anchorCoordinates?: { x: number; y: number }
  key: string
  label: string
}

const addData = ref<AddData | null>(null)

function closeOverlay() {
  addData.value = null
}

function onSelectBundle(bundle: string) {
  if (!addData.value) {
    return
  }

  eventBus.emit('block:append', {
    bundle,
    host: { ...addData.value.host },
    afterUuid: addData.value.preceedingUuid,
  })

  closeOverlay()
}

function onSelectAction(action: AddAction) {
  if (!addData.value) {
    return
  }

  action.callback({
    field: addData.value.field,
    preceedingUuid: addData.value.preceedingUuid,
    host: { ...addData.value.host },
  })
  closeOverlay()
}

type CachedState = {
  orientation: Orientation
  gap: number
  canShowBeforeAfter: boolean
}

// Cache state per UUID
const cache = new Map<string, CachedState>()

function clearAllCache() {
  cache.clear()
  containerStyle.value = { visibility: 'hidden' }
  orientationClass.value = ''
}

function updateCache(uuid: string) {
  // Check if we have cached state for this UUID
  let cachedState = cache.get(uuid)

  if (!cachedState) {
    // Compute and cache state for this UUID
    const block = blocks.getBlock(uuid)
    if (!block) {
      return
    }

    const field = fields.find(block.host.uuid, block.host.fieldName)
    if (!field) {
      return
    }

    const orientation = getChildrenOrientation(field.element)
    const gap = Math.max(getGapSize(orientation, field.element), MIN_GAP)

    // Check if the parent field can accept more blocks
    const fieldChildren = [...field.element.children] as HTMLElement[]
    const currentCount = state.getFieldBlockCount(field.key)
    const canShow = determineCanAddChildren(
      field,
      fieldChildren,
      [], // Not moving any blocks, adding a new one
      currentCount,
      1, // Adding 1 new block
      [], // Don't know which bundle will be added
    )

    cachedState = {
      orientation,
      gap,
      canShowBeforeAfter: canShow,
    }

    cache.set(uuid, cachedState)
  }

  // Apply cached state
  orientationClass.value =
    cachedState.orientation === 'vertical'
      ? 'bk-is-vertical'
      : 'bk-is-horizontal'
}

watch(
  uuid,
  async (newUuid) => {
    closeOverlay()
    if (!shouldRender.value) {
      containerStyle.value = { visibility: 'hidden' }
      return
    }

    if (newUuid) {
      await renderCycle()
      updateCache(newUuid)
    }
  },
  { immediate: true },
)

onBlokkliEvent('animationFrame:after', () => {
  if (!shouldRender.value || !uuid.value) {
    containerStyle.value = { visibility: 'hidden' }
    containerRect.value = null
    return
  }

  const cachedState = cache.get(uuid.value)
  if (!cachedState) {
    return
  }

  const blockRect = dom.getBlockRect(uuid.value)
  if (!blockRect) {
    return
  }

  if (blockRect.width === 0) {
    containerStyle.value = { visibility: 'hidden' }
    containerRect.value = null
    return
  }

  // Position container to match block rect
  containerStyle.value = {
    transform: `translate(${blockRect.x}px, ${blockRect.y}px)`,
    width: `${blockRect.width}px`,
    height: `${blockRect.height}px`,
    '--gap': `${cachedState.gap}px`,
    visibility: 'visible',
  }

  // Store container rect for child components
  containerRect.value = { x: blockRect.x, y: blockRect.y }
})

onBlokkliEvent('state:reloaded', () => {
  clearAllCache()
  if (shouldRender.value && uuid.value) {
    updateCache(uuid.value)
  }
})

function setAddData(
  key: string,
  field: BlokkliFieldElement,
  label: string,
  preceedingUuid: string | null,
  anchorEl?: HTMLElement,
  anchorCoordinates?: { x: number; y: number },
) {
  const allowedBundles = field.allowedBundles
  if (allowedBundles.length === 0) {
    return
  }

  const host: DraggableHostData = {
    type: field.hostEntityType,
    uuid: field.hostEntityUuid,
    fieldName: field.name,
  }

  // If only one bundle: Directly add it.
  if (allowedBundles.length === 1) {
    const bundle = allowedBundles[0]!
    eventBus.emit('block:append', {
      bundle,
      host,
      afterUuid: preceedingUuid,
    })
    return
  }

  addData.value = {
    key,
    allowedBundles,
    preceedingUuid,
    host,
    anchorEl,
    anchorCoordinates,
    label,
    field,
  }
}

function getPreceedingUuidBefore(
  uuid: string,
  field: BlokkliFieldElement,
): string | null {
  const children = [...field.element.children] as HTMLElement[]
  let prevUuid: string | undefined = undefined

  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (!child) {
      continue
    }
    const childUuid = child.dataset.bkUuid
    if (childUuid === uuid) {
      return prevUuid ?? null
    }
    prevUuid = childUuid
  }

  return null
}

function onRendererToggle(data: {
  position: 'before' | 'after'
  coordinates: { x: number; y: number }
}) {
  const key = data.position
  if (addData.value?.key === key) {
    return closeOverlay()
  }

  if (!uuid.value) {
    return
  }

  const cachedState = cache.get(uuid.value)
  if (!cachedState) {
    return
  }

  const block = blocks.getBlock(uuid.value)
  if (!block) {
    return
  }

  const field = fields.find(block.host.uuid, block.host.fieldName)
  if (!field) {
    return
  }

  if (!field.allowedBundles.length) {
    return
  }

  let preceedingUuid: string | null
  let label: string

  if (data.position === 'before') {
    preceedingUuid = getPreceedingUuidBefore(uuid.value, field)
    label = beforeTooltip.value.replace('...', '')
  } else {
    preceedingUuid = uuid.value
    label = afterTooltip.value.replace('...', '')
  }

  setAddData(key, field, label, preceedingUuid, undefined, data.coordinates)
}

function onRendererToggleField(data: {
  index: number
  coordinates: { x: number; y: number }
}) {
  const key = 'field:' + data.index
  if (addData.value?.key === key) {
    return closeOverlay()
  }

  if (!uuid.value) {
    return
  }

  const emptyField = emptyBlockFields.value[data.index]
  if (!emptyField) {
    return
  }

  const field = fields.find(uuid.value, emptyField.name)
  if (!field) {
    return
  }

  const label = (fieldTooltips.value[data.index] || '').replace('...', '')
  setAddData(key, field, label, null, undefined, data.coordinates)
}

onBlokkliEvent('dragging:start', closeOverlay)
</script>
