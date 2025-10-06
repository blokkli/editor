<template>
  <Teleport to="#bk-indicators">
    <div
      v-if="shouldRender"
      v-show="showOverlay"
      class="bk-selection-add"
      :class="orientationClass"
      :style="containerStyle"
    >
      <button
        ref="before"
        :key="'before' + orientationClass"
        class="bk-selection-add-button bk-before"
        :style="beforeAfterStyle"
        :data-title="beforeTooltip"
        tabindex="-1"
        @click="onClickBefore"
      >
        <div>
          <Icon name="plus" />
        </div>
      </button>

      <button
        ref="after"
        :key="'after' + orientationClass"
        class="bk-selection-add-button bk-after"
        :style="beforeAfterStyle"
        :data-title="afterTooltip"
        tabindex="-1"
        @click="onClickAfter"
      >
        <div>
          <Icon name="plus" />
        </div>
      </button>
    </div>
    <AddButtonsField
      v-for="(slot, index) in fieldButtonSlots"
      v-show="showOverlay"
      :key="index"
      :field-key="slot.fieldKey"
      :container-rect="containerRect"
      :title="fieldTooltips[index] || ''"
      @click="(el) => onClickEmptyField(index, el)"
    />
  </Teleport>

  <Teleport to="body">
    <BlokkliTransition name="caret-tooltip">
      <Overlay
        v-if="addData"
        :key="addData.key"
        :bundles="addData.allowedBundles"
        :anchor-el="addData.anchorEl"
        :label="addData.label"
        @select="onSelectBundle"
        @close="closeOverlay"
        @action="onSelectAction"
      />
    </BlokkliTransition>
  </Teleport>
</template>

<script setup lang="ts">
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { computed, useBlokkli, ref, watch, useTemplateRef } from '#imports'
import { Icon, BlokkliTransition } from '#blokkli/components'
import {
  getChildrenOrientation,
  getGapSize,
  MIN_GAP,
  type Orientation,
  determineCanAddChildren,
} from '#blokkli/helpers/dropTargets'
import type {
  BlokkliFieldElement,
  DraggableExistingBlock,
  DraggableHostData,
} from '#blokkli/types'
import Overlay from './Overlay/index.vue'
import AddButtonsField from './AddButtonsField.vue'
import { renderCycle } from '#blokkli/helpers/renderCycle'
import { getFieldKey } from '#blokkli/helpers'
import { isInternalBundle } from '#blokkli/helpers/bundles'

const props = defineProps<{
  blocks: DraggableExistingBlock[]
}>()

const { dom, state, eventBus, types, ui, selection, $t } = useBlokkli()

const showOverlay = computed(
  () =>
    !ui.isTransforming.value &&
    !ui.isAnalyzing.value &&
    !selection.isMultiSelecting.value &&
    !selection.isDragging.value &&
    !ui.hasTransformOverlayOpen.value &&
    !selection.isChangingOptions.value,
)

const afterEl = useTemplateRef('after')
const beforeEL = useTemplateRef('before')

const shouldRender = computed(() => {
  // Add buttons are only visible when one block is selected.
  return props.blocks.length === 1
})

const block = computed<DraggableExistingBlock | null>(() => {
  if (props.blocks.length === 1) {
    return props.blocks[0] ?? null
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
    .forEntityTypeAndBundle(block.value.entityType, block.value.itemBundle)
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
    types.getBlockBundleDefinition(block.value.itemBundle)?.label ||
    block.value.itemBundle
  )
})

const allowedBundlesForField = computed(() => {
  if (!block.value) {
    return []
  }

  const blockData = dom.findBlock(block.value.uuid)
  if (!blockData) {
    return []
  }

  const field = dom.findField(blockData.hostUuid, blockData.hostFieldName)
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
      .forEntityTypeAndBundle(block.value!.entityType, block.value!.itemBundle)
      .find((f) => f.name === field.name)

    const fieldLabel = fieldConfig?.label || field.name

    // Get field element to check allowed bundles
    const fieldElement = dom.findField(block.value!.uuid, field.name)
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
  preceedingUuid?: string
  host: DraggableHostData
  field: BlokkliFieldElement
  anchorEl: HTMLElement
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

function onSelectAction(id: string) {
  if (!addData.value) {
    return
  }

  eventBus.emit('action:placed', {
    id,
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

const canShowBeforeAfter = ref(false)
const beforeAfterStyle = computed<Record<string, string>>(() => ({
  visibility: canShowBeforeAfter.value ? 'visible' : 'hidden',
}))

function clearAllCache() {
  cache.clear()
  canShowBeforeAfter.value = false
  containerStyle.value = { visibility: 'hidden' }
  orientationClass.value = ''
}

function updateCache(uuid: string) {
  // Check if we have cached state for this UUID
  let cachedState = cache.get(uuid)

  if (!cachedState) {
    // Compute and cache state for this UUID
    const block = dom.findBlock(uuid)
    if (!block) {
      return
    }

    const field = dom.findField(block.hostUuid, block.hostFieldName)
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
  canShowBeforeAfter.value = cachedState.canShowBeforeAfter
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
      canShowBeforeAfter.value = false
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

onBlokkliEvent('canvas:draw', () => {
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
  anchorEl: HTMLElement,
  label: string,
  preceedingUuid?: string,
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
    label,
    field,
  }
}

function getPreceedingUuidBefore(
  uuid: string,
  field: BlokkliFieldElement,
): string | undefined {
  const children = [...field.element.children] as HTMLElement[]
  let prevUuid: string | undefined = undefined

  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (!child) {
      continue
    }
    const childUuid = child.dataset.uuid
    if (childUuid === uuid) {
      return prevUuid
    }
    prevUuid = childUuid
  }

  return undefined
}

function onClickBefore() {
  if (addData.value?.key === 'before') {
    return closeOverlay()
  }
  if (!uuid.value) {
    return
  }

  const cachedState = cache.get(uuid.value)
  if (!cachedState) {
    return
  }

  const block = dom.findBlock(uuid.value)
  if (!block) {
    return
  }

  const field = dom.findField(block.hostUuid, block.hostFieldName)
  if (!field) {
    return
  }

  const preceedingUuid = getPreceedingUuidBefore(uuid.value, field)

  if (!beforeEL.value) {
    return
  }

  const label = beforeTooltip.value.replace('...', '')
  setAddData('before', field, beforeEL.value, label, preceedingUuid)
}

function onClickAfter() {
  if (addData.value?.key === 'after') {
    return closeOverlay()
  }

  if (!uuid.value) {
    return
  }

  const cachedState = cache.get(uuid.value)
  if (!cachedState) {
    return
  }

  const block = dom.findBlock(uuid.value)
  if (!block) {
    return
  }

  const field = dom.findField(block.hostUuid, block.hostFieldName)
  if (!field) {
    return
  }

  if (!afterEl.value) {
    return
  }

  if (!field.allowedBundles.length) {
    return
  }

  const label = afterTooltip.value.replace('...', '')
  setAddData('after', field, afterEl.value, label, uuid.value)
}

function onClickEmptyField(index: number, element: HTMLElement) {
  const key = 'field:' + index
  if (addData.value?.key === key) {
    return closeOverlay()
  }

  if (!uuid.value) {
    return
  }

  const emptyField = emptyBlockFields.value[index]
  if (!emptyField) {
    return
  }

  const field = dom.findField(uuid.value, emptyField.name)
  if (!field) {
    return
  }

  const label = (fieldTooltips.value[index] || '').replace('...', '')
  setAddData(key, field, element, label)
}

onBlokkliEvent('mouse:up', closeOverlay)
</script>
