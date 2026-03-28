<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <div class="bk-clipboard-drop-element-wrapper">
      <DropElement
        ref="dropElementRef"
        :bundles="directDropBundles"
        :items="dropItems"
      />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  defineBlokkliFeature,
  ref,
  useBlokkli,
  onMounted,
  onUnmounted,
  computed,
  useTemplateRef,
} from '#imports'

import { falsy, getFieldKey } from '#blokkli/helpers'
import { generateUUID } from '#blokkli/editor/helpers/uuid'
import getVideoId from 'get-video-id'
import DropElement, { type DropElementItem } from './DropElement/index.vue'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { emitMessage } from '#blokkli/editor/events'
import { fragmentBlockBundle, itemEntityType } from '#blokkli-build/config'
import {
  defineDropHandler,
  defineItemDropdownAction,
  defineShortcut,
  onBlokkliEvent,
} from '#blokkli/editor/composables'
import type { BlokkliClipboardItem, DraggableNativeDropItem } from './types'
import { buildMapBundleEvent, sanitizeHtml } from './helpers'
import type { RenderedFieldListItem } from '#blokkli/editor/types/field'
import type { DraggableExistingBlock } from '#blokkli/editor/types/draggable'

const { logger } = defineBlokkliFeature({
  id: 'clipboard',
  label: 'Clipboard',
  icon: 'bk_mdi_content_paste',
  description:
    'Provides clipboard integration to copy/paste existing blocks or paste supported clipboard content like text or images.',

  screenshot: 'feature-clipboard.jpg',
})

const {
  selection,
  $t,
  adapter,
  state,
  ui,
  types,
  keyboard,
  blocks,
  fields,
  eventBus,
  animation,
  permissions,
} = useBlokkli()

const selectionClipboard = ref<string[]>([])

// ---------------------------------------------------------------------------
// Drop element state (used for both native drag and clipboard paste).
// ---------------------------------------------------------------------------
const isDirectDrop = ref(false)
const directDropBundles = ref<string[]>([])
const dropItems = ref<DropElementItem[]>([])
const dropElementRef = useTemplateRef('dropElementRef')
let dragCounter = 0
let nativeDropItem: DraggableNativeDropItem | null = null

// ---------------------------------------------------------------------------
// Shared helpers.
// ---------------------------------------------------------------------------
function positionDropElement(x: number, y: number) {
  const el = dropElementRef.value?.$el as HTMLElement | undefined
  const wrapper = el?.parentElement
  if (wrapper && el) {
    const w = el.offsetWidth
    const h = el.offsetHeight
    wrapper.style.left = x - w / 2 + 'px'
    wrapper.style.top = y - h / 2 + 'px'
  }
}

function normalizeBundles(
  result: string | string[] | undefined | null,
): string[] | null {
  if (!result) return null
  return Array.isArray(result) ? result : [result]
}

function startClipboardDrag(
  item: BlokkliClipboardItem,
  bundles?: string[],
  allItems?: BlokkliClipboardItem[],
) {
  if (
    !adapter.clipboardMapBundle ||
    !adapter.addBlockFromClipboardItem ||
    state.editMode.value !== 'editing' ||
    !dropElementRef.value
  ) {
    return
  }

  const itemBundles = bundles || [item.itemBundle]
  if (!itemBundles.length) {
    return
  }

  const items = allItems || [item]
  directDropBundles.value = itemBundles
  dropItems.value = items.map((v) => ({
    type: v.type,
    data: v.data,
    fileName: 'fileName' in v ? v.fileName : undefined,
    fileSize: 'fileSize' in v ? v.fileSize : undefined,
    videoId: 'videoId' in v ? v.videoId : undefined,
    videoService: 'videoService' in v ? v.videoService : undefined,
  }))

  const coords = animation.getMouseCoords()
  positionDropElement(coords.x, coords.y)

  const el = dropElementRef.value.$el as HTMLElement

  nativeDropItem = {
    itemType: 'native_drop',
    itemBundles,
    dataTransfer: null,
    clipboardItems: allItems || [item],
    element: () => el,
  }

  isDirectDrop.value = true

  eventBus.emit('dragging:start', {
    items: [nativeDropItem],
    coords,
    mode: 'mouse',
  })
}

// ---------------------------------------------------------------------------
// Native drag (file/text from OS).
// ---------------------------------------------------------------------------
function tryStartDirectDrop(e: DragEvent): boolean {
  if (
    !adapter.clipboardMapBundle ||
    !adapter.addBlockFromClipboardItem ||
    state.editMode.value !== 'editing' ||
    !dropElementRef.value
  ) {
    return false
  }

  const mapEvent = buildMapBundleEvent(e)
  if (!mapEvent) {
    return false
  }

  const bundles = normalizeBundles(adapter.clipboardMapBundle(mapEvent))
  if (!bundles) {
    return false
  }

  const itemType = mapEvent.type === 'plaintext' ? 'text' : mapEvent.type
  const fileCount = mapEvent.fileCount || 1

  directDropBundles.value = bundles
  // During native drag we only know the type and maybe file name — no data yet.
  dropItems.value = Array.from({ length: fileCount }, () => ({
    type: itemType as DropElementItem['type'],
    fileName: mapEvent.fileName,
  }))
  positionDropElement(e.clientX, e.clientY)

  const el = dropElementRef.value!.$el as HTMLElement

  nativeDropItem = {
    itemType: 'native_drop',
    itemBundles: bundles,
    dataTransfer: null,
    element: () => el,
  }

  isDirectDrop.value = true

  eventBus.emit('dragging:start', {
    items: [nativeDropItem],
    coords: { x: e.clientX, y: e.clientY },
    mode: 'mouse',
  })

  return true
}

function resetDrag() {
  dragCounter = 0
  isDragFromInput = false
  if (isDirectDrop.value) {
    eventBus.emit('dragging:end')
    isDirectDrop.value = false
    nativeDropItem = null
    directDropBundles.value = []
    dropItems.value = []
  }
}

let isDragFromInput = false

function onDragStart(e: DragEvent) {
  const target = e.target
  if (
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLInputElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  ) {
    isDragFromInput = true
  }
}

function onDragEnter(e: DragEvent) {
  if (isDragFromInput) {
    return
  }
  dragCounter++
  if (dragCounter === 1) {
    tryStartDirectDrop(e)
  }
}

function onDragLeave() {
  if (isDragFromInput) {
    return
  }
  dragCounter--
  if (dragCounter <= 0) {
    resetDrag()
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (isDirectDrop.value) {
    eventBus.emit('dragging:move', { x: e.clientX, y: e.clientY })
  }
}

function onNativeDrop(e: DragEvent) {
  e.preventDefault()

  if (isDragFromInput) {
    isDragFromInput = false
    return
  }

  if (isDirectDrop.value && nativeDropItem && e.dataTransfer) {
    nativeDropItem.dataTransfer = e.dataTransfer
    // Emit mouse:up so the Renderer can check for a valid drop target and
    // potentially emit dragging:drop. mitt handlers run synchronously, so
    // by the time this returns dragging:drop has already been dispatched
    // (if a valid target was found).
    eventBus.emit('mouse:up', {
      type: 'mouse',
      x: e.clientX,
      y: e.clientY,
      distance: 100,
      duration: 1000,
    })
    // Always emit dragging:end to clean up. In normal drag the pointerup
    // DOM handler does this, but pointerup never fires during a native drag.
    eventBus.emit('dragging:end')
    dragCounter = 0
    isDirectDrop.value = false
    nativeDropItem = null
    directDropBundles.value = []
    dropItems.value = []
    return
  }

  resetDrag()
  if (e.dataTransfer) {
    onDropFallback(e.dataTransfer)
  }
}

// ---------------------------------------------------------------------------
// Clipboard paste & drop fallback handling.
// ---------------------------------------------------------------------------
type DropdownItem = {
  id: 'copy' | 'paste'
  label: string
  icon: BlokkliIcon
  description: string
  enabled?: boolean
}

const itemDropdownItems = computed<DropdownItem[]>(() => {
  return [
    {
      id: 'copy',
      label: $t('copy', 'Copy'),
      icon: 'bk_mdi_content_copy',
      description: $t('clipboardCopyShortcutHelp', 'Copy selected blocks'),
    },
    {
      id: 'paste',
      label: $t('paste', 'Paste'),
      enabled: !!selectionClipboard.value.length,
      icon: 'bk_mdi_content_paste',
      description: $t(
        'clipboardPasteDescription',
        'Paste blocks from clipboard',
      ),
    },
  ]
})

function onSelectDropdownItem(item: DropdownItem) {
  if (item.id === 'copy') {
    copyCurrentSelectionToClipboard()
  } else if (item.id === 'paste' && selectionClipboard.value.length) {
    handleSelectionPaste(selectionClipboard.value)
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => {
      if (typeof fr.result === 'string') {
        resolve(fr.result)
      } else {
        reject(new Error('FileReader result is not a string'))
      }
    }
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(file)
  })
}

async function handleFiles(data: DataTransfer | FileList) {
  if (!FileReader || !adapter.clipboardMapBundle) {
    return
  }

  const files = data instanceof DataTransfer ? [...data.files] : [...data]
  if (!files.length) {
    return
  }

  // Map each file to its bundles and intersect to find common bundles.
  let commonBundles: string[] | null = null
  for (const file of files) {
    const type: 'image' | 'file' = file.type.startsWith('image/')
      ? 'image'
      : 'file'
    const fileBundles = normalizeBundles(
      adapter.clipboardMapBundle({
        type,
        fileType: file.type,
        fileSize: file.size,
      }),
    )
    if (!fileBundles) {
      emitPasteError(
        $t('clipboardUnsupportedFileType', 'This file type is not supported.'),
      )
      return
    }
    if (commonBundles === null) {
      commonBundles = fileBundles
    } else {
      commonBundles = commonBundles.filter((b) => fileBundles.includes(b))
    }
  }

  if (!commonBundles || !commonBundles.length) {
    emitPasteError(
      $t('clipboardNoCommonBundle', 'No common block type for these files.'),
    )
    return
  }

  // Read all files.
  let results: string[]
  try {
    results = await Promise.all(files.map(readFileAsDataURL))
  } catch {
    return
  }

  // Build clipboard items from results.
  const items: BlokkliClipboardItem[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!
    const result = results[i]!
    const type: 'image' | 'file' = file.type.startsWith('image/')
      ? 'image'
      : 'file'
    items.push({
      type,
      itemBundle: commonBundles[0]!,
      id: generateUUID(),
      data: result,
      additional: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileName: file.name,
    })
  }

  startClipboardDrag(items[0]!, commonBundles, items)
}

function onDropFallback(data: DataTransfer) {
  if (data.files.length) {
    handleFiles(data)
  } else {
    const text =
      data.getData('text/html') ||
      data.getData('text/plain') ||
      data.getData('text')
    if (text) {
      handlePastedText(text)
    }
  }
}

function emitPasteError(message: string) {
  const prefix = $t('clipboardPasteError', 'Failed to paste:')
  emitMessage(`${prefix} ${message}`, 'error')
}

function startCopyDrag(existingBlocks: RenderedFieldListItem[]) {
  const items: DraggableExistingBlock[] = existingBlocks.map((block) => ({
    itemType: 'existing',
    block,
    isCopy: true,
  }))

  const coords = animation.getMouseCoords()

  eventBus.emit('dragging:start', {
    items,
    coords,
    mode: 'mouse',
  })
}

const handleSelectionPaste = (pastedUuids: string[]) => {
  if (!adapter.pasteExistingBlocks) {
    return
  }

  if (!pastedUuids.length) {
    return
  }

  // Validate that the copied blocks still exist.
  const existingBlocks = pastedUuids
    .map((uuid) => blocks.getBlock(uuid))
    .filter((block): block is RenderedFieldListItem => !!block)

  if (!existingBlocks.length) {
    return
  }

  // Check that the user has "add" permission for all block bundles.
  const deniedBundles = existingBlocks
    .map((b) => b.bundle)
    .filter((bundle) => !permissions.checkBlockBundlePermission(bundle, 'add'))
  if (deniedBundles.length) {
    return
  }

  // If nothing is selected, start a drag interaction.
  if (selection.uuids.value.length !== 1) {
    startCopyDrag(existingBlocks)
    return
  }

  const block = selection.items.value[0]
  if (!block) {
    startCopyDrag(existingBlocks)
    return
  }

  let targetField = null
  let targetFieldElement = null
  let targetFieldKey = null
  let preceedingUuid: string | null = null

  // Only try to paste into nested fields if Shift is not pressed
  if (!keyboard.isPressingShift.value) {
    // Get bundles and fragments of pasted blocks first
    const pastedBundles = existingBlocks
      .map((b) => b.bundle)
      .filter((bundle): bundle is string => !!bundle)

    const pastedFragments = existingBlocks
      .map((b) => {
        if (b.bundle === fragmentBlockBundle && b.fragment?.name) {
          return b.fragment.name
        }
        return null
      })
      .filter(falsy)

    if (pastedBundles.length) {
      // Check if the selected block has nested fields that can accept any of the pasted blocks
      const nestedFields = types.fieldConfig.forEntityTypeAndBundle(
        itemEntityType,
        block.bundle,
      )

      // Try to find a nested field that accepts the pasted blocks
      for (const fieldConfig of nestedFields) {
        // Get the actual field element to check allowed bundles/fragments
        const fieldElement = fields.find(block.uuid, fieldConfig.name)
        if (!fieldElement) {
          continue
        }

        const allowedPastedBundles = pastedBundles.filter((bundle) =>
          fieldElement.allowedBundles.includes(bundle),
        )

        // If there are fragment restrictions, also check fragments
        let fragmentsAllowed = true
        if (
          pastedFragments.length > 0 &&
          fieldElement.allowedFragments.length > 0
        ) {
          fragmentsAllowed = pastedFragments.every((fragment) =>
            fieldElement.allowedFragments.includes(fragment),
          )
        }

        if (allowedPastedBundles.length > 0 && fragmentsAllowed) {
          const nestedFieldKey = getFieldKey(block.uuid, fieldConfig.name)
          const currentCount = state.getFieldBlockCount(nestedFieldKey)

          // Check cardinality
          if (
            fieldElement.cardinality === -1 ||
            currentCount + allowedPastedBundles.length <=
              fieldElement.cardinality
          ) {
            targetField = {
              entityType: itemEntityType,
              entityUuid: block.uuid,
              name: fieldConfig.name,
            }
            targetFieldElement = fieldElement
            targetFieldKey = nestedFieldKey
            preceedingUuid = null // Paste at the beginning of the nested field
            break
          }
        }
      }
    }
  }

  // If no suitable nested field found, use the parent field
  if (!targetField || !targetFieldElement || !targetFieldKey) {
    const field = state.getMutatedField(block.host.uuid, block.host.fieldName)
    if (field) {
      const fieldElement = fields.find(field.entityUuid, field.name)
      if (fieldElement) {
        targetField = {
          entityType: field.entityType,
          entityUuid: field.entityUuid,
          name: field.name,
        }
        targetFieldElement = fieldElement
        targetFieldKey = getFieldKey(field.entityUuid, field.name)
        preceedingUuid = selection.uuids.value[0] ?? null
      }
    }
  }

  // If we couldn't resolve a target field, fall back to drag.
  if (!targetField || !targetFieldElement || !targetFieldKey) {
    startCopyDrag(existingBlocks)
    return
  }

  // Filter blocks to only those allowed in the target field.
  const pastedBlocks = existingBlocks.filter((b) => {
    if (!targetFieldElement.allowedBundles.includes(b.bundle)) {
      return false
    }
    if (
      b.bundle === fragmentBlockBundle &&
      b.fragment?.name &&
      targetFieldElement.allowedFragments.length > 0
    ) {
      return targetFieldElement.allowedFragments.includes(b.fragment.name)
    }
    return true
  })

  // If none of the blocks are allowed, fall back to drag.
  if (!pastedBlocks.length) {
    startCopyDrag(existingBlocks)
    return
  }

  // Check cardinality.
  const count = state.getFieldBlockCount(targetFieldKey)
  if (
    targetFieldElement.cardinality !== -1 &&
    count + pastedBlocks.length > targetFieldElement.cardinality
  ) {
    startCopyDrag(existingBlocks)
    return
  }

  state.mutateWithLoadingState(() =>
    adapter.pasteExistingBlocks!({
      uuids: pastedBlocks.map((v) => v.uuid),
      host: {
        type: targetField.entityType,
        uuid: targetField.entityUuid,
        fieldName: targetField.name,
      },
      preceedingUuid,
    }),
  )
}

function onPaste(e: ClipboardEvent) {
  logger.log('Paste Event', e)
  if (state.editMode.value !== 'editing') {
    return
  }
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement
  ) {
    return
  }

  // Stop data actually being pasted into div.
  e.stopPropagation()
  e.preventDefault()

  if (state.isLoading.value || selection.isDragging.value) {
    return
  }

  const clipboardData = e.clipboardData
  if (!clipboardData) {
    return
  }

  // Handle files first – when pasting an image, browsers often include a
  // text representation alongside the file data which would incorrectly
  // trigger text handling.
  if (clipboardData.files.length) {
    return handleFiles(clipboardData)
  }

  const pastedData =
    clipboardData.getData('text/html') ||
    clipboardData.getData('text/plain') ||
    clipboardData.getData('text')

  if (pastedData) {
    if (pastedData.startsWith('{')) {
      try {
        const data = JSON.parse(pastedData)
        if (
          typeof data === 'object' &&
          data.type &&
          data.type === 'selection'
        ) {
          const uuids: string[] = data.uuids
          return handleSelectionPaste(uuids)
        }
      } catch (_e) {
        // Noop.
      }
    }
    handlePastedText(pastedData)
  }
}

const handlePastedText = (text: string) => {
  if (!adapter.clipboardMapBundle) {
    return
  }
  const video = getVideoId(text)
  if (video.id && video.service) {
    const itemBundles = normalizeBundles(
      adapter.clipboardMapBundle({
        type: 'video',
        videoService: video.service,
        videoId: video.id,
      }),
    )
    if (!itemBundles) {
      return
    }
    startClipboardDrag(
      {
        type: 'video',
        id: generateUUID(),
        itemBundle: itemBundles[0]!,
        data: text,
        videoService: video.service,
        videoId: video.id,
      },
      itemBundles,
    )
    return
  }

  const div = document.createElement('div')
  div.innerHTML = text.replace(/&nbsp;|<br>/g, '')

  sanitizeHtml(div)
  if (div.textContent) {
    const itemBundles = normalizeBundles(
      adapter.clipboardMapBundle({
        type: 'plaintext',
        text: div.innerHTML,
      }),
    )
    if (!itemBundles) {
      return
    }
    startClipboardDrag(
      {
        type: 'text',
        id: generateUUID(),
        itemBundle: itemBundles[0]!,
        data: div.innerHTML,
      },
      itemBundles,
    )
  }
}

// ---------------------------------------------------------------------------
// Drop handlers: native_drop and clipboard.
// ---------------------------------------------------------------------------

/**
 * Try to detect if a URL string is a plain URL (not embedded in HTML).
 * Returns the URL if it looks like a bare URL, null otherwise.
 */
function extractBareUrl(text: string): string | null {
  const trimmed = text.trim()
  try {
    const url = new URL(trimmed)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return trimmed
    }
  } catch {
    // Not a valid URL.
  }
  return null
}

defineDropHandler('native_drop', {
  resolveBundles({ items, field }) {
    const item = items[0]!

    if (!adapter.addBlockFromClipboardItem) {
      return []
    }

    // If clipboardItems are already pre-built (from paste path), use the
    // item's bundles directly.
    if (item.clipboardItems?.length) {
      return field.allowedBundles.filter((b) => item.itemBundles.includes(b))
    }

    if (!item.dataTransfer) {
      return field.allowedBundles.filter((b) => item.itemBundles.includes(b))
    }

    const dt = item.dataTransfer

    // For files: re-validate via clipboardMapBundle with actual file info.
    // Eagerly extract File objects since DataTransfer will be invalidated
    // after this synchronous handler returns (e.g. while bundle selector is
    // shown).
    if (dt.files.length > 0) {
      item.files = [...dt.files]
      if (!adapter.clipboardMapBundle) {
        return field.allowedBundles.filter((b) => item.itemBundles.includes(b))
      }
      let possibleBundles: string[] | null = null
      for (const file of item.files) {
        const type: 'image' | 'file' = file.type.startsWith('image/')
          ? 'image'
          : 'file'
        const mapped = normalizeBundles(
          adapter.clipboardMapBundle({
            type,
            fileType: file.type,
            fileSize: file.size,
          }),
        )
        if (!mapped) {
          return []
        }
        if (possibleBundles === null) {
          possibleBundles = mapped
        } else {
          possibleBundles = possibleBundles.filter((b) => mapped.includes(b))
        }
      }
      return (possibleBundles || []).filter((b) =>
        field.allowedBundles.includes(b),
      )
    }

    // For text: read DataTransfer NOW and detect content type.
    const text =
      dt.getData('text/html') || dt.getData('text/plain') || dt.getData('text')
    if (!text) {
      return []
    }

    if (adapter.clipboardMapBundle) {
      // Try video detection.
      const video = getVideoId(text)
      if (video.id && video.service) {
        const mapped = normalizeBundles(
          adapter.clipboardMapBundle({
            type: 'video',
            videoService: video.service,
            videoId: video.id,
          }),
        )
        if (mapped?.length) {
          item.clipboardItems = [
            {
              type: 'video',
              id: generateUUID(),
              itemBundle: mapped[0]!,
              data: text,
              videoService: video.service,
              videoId: video.id,
            },
          ]
          return mapped.filter((b) => field.allowedBundles.includes(b))
        }
      }

      // Try URL detection (not a video).
      const bareUrl = extractBareUrl(text)
      if (bareUrl) {
        const mapped = normalizeBundles(
          adapter.clipboardMapBundle({ type: 'link', url: bareUrl }),
        )
        if (mapped?.length) {
          item.clipboardItems = [
            {
              type: 'text',
              id: generateUUID(),
              itemBundle: mapped[0]!,
              data: bareUrl,
            },
          ]
          return mapped.filter((b) => field.allowedBundles.includes(b))
        }
      }

      // Fall through to plaintext.
      const mapped = normalizeBundles(
        adapter.clipboardMapBundle({ type: 'plaintext', text }),
      )
      if (mapped?.length) {
        item.clipboardItems = [
          {
            type: 'text',
            id: generateUUID(),
            itemBundle: mapped[0]!,
            data: text,
          },
        ]
        return mapped.filter((b) => field.allowedBundles.includes(b))
      }
    }

    // No clipboardMapBundle — use pre-determined bundles.
    // Eagerly store text as clipboardItems since DataTransfer will be
    // invalidated after this synchronous handler returns.
    item.clipboardItems = [
      {
        type: 'text',
        id: generateUUID(),
        itemBundle: item.itemBundles[0]!,
        data: text,
      },
    ]
    return field.allowedBundles.filter((b) => item.itemBundles.includes(b))
  },

  async execute({ items, host, afterUuid, bundle }) {
    if (!adapter.addBlockFromClipboardItem) {
      return
    }

    const item = items[0]!

    // Clipboard paste path: data is already available via clipboardItems.
    if (item.clipboardItems?.length) {
      await state.mutateWithLoadingState(async () => {
        let lastResult
        for (const clipItem of item.clipboardItems!) {
          lastResult = await adapter.addBlockFromClipboardItem!({
            item: clipItem,
            blockBundle: bundle,
            host,
            afterUuid,
          })
        }
        return lastResult!
      })
      return
    }

    // Use eagerly extracted files (stored in resolveBundles) to avoid stale
    // DataTransfer after async bundle selection.
    const files = item.files
    if (files?.length) {
      // Re-validate each file's bundle with actual file size.
      if (adapter.clipboardMapBundle) {
        for (const file of files) {
          const type: 'image' | 'file' = file.type.startsWith('image/')
            ? 'image'
            : 'file'
          const mapped = adapter.clipboardMapBundle({
            type,
            fileType: file.type,
            fileSize: file.size,
          })
          if (!mapped) {
            emitMessage('This file type or size is not supported.', 'error')
            return
          }
        }
      }

      let results: string[]
      try {
        results = await Promise.all(files.map(readFileAsDataURL))
      } catch {
        return
      }

      const clipboardItems: BlokkliClipboardItem[] = files.map((file, i) => {
        const type: 'image' | 'file' = file.type.startsWith('image/')
          ? 'image'
          : 'file'
        return {
          type,
          id: generateUUID(),
          itemBundle: bundle,
          data: results[i]!,
          additional: file.name,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        }
      })

      await state.mutateWithLoadingState(async () => {
        let lastResult
        for (const clipItem of clipboardItems) {
          lastResult = await adapter.addBlockFromClipboardItem!({
            item: clipItem,
            blockBundle: bundle,
            host,
            afterUuid,
          })
        }
        return lastResult!
      })
    }
  },
})

defineDropHandler('clipboard', {
  async execute({ items, host, afterUuid }) {
    const item = items[0]!
    eventBus.emit('drop:clipboardItem', {
      id: item.clipboardId,
      host,
      blockBundle: item.itemBundle,
      afterUuid,
    })
  },
})

function setClipboard(text: string) {
  const type = 'text/plain'
  const blob = new Blob([text], { type })
  const data = [new ClipboardItem({ [type]: blob })]

  try {
    navigator.clipboard.write(data)
  } catch (_e) {
    // Noop.
  }
}

function copyCurrentSelectionToClipboard() {
  if (!selection.items.value.length) {
    selectionClipboard.value = []
    return
  }

  setClipboard(
    JSON.stringify({ type: 'selection', uuids: selection.uuids.value }),
  )
  selectionClipboard.value = selection.uuids.value
}

onBlokkliEvent('keyPressed', (e) => {
  if (
    e.code !== 'c' ||
    !e.meta ||
    ui.hasDialogOpen.value ||
    ui.hasNestedEditorOpen.value ||
    !ui.canvasFocused.value
  ) {
    return
  }
  copyCurrentSelectionToClipboard()
})

defineShortcut([
  {
    code: 'C',
    label: $t('clipboardCopyShortcutHelp', 'Copy selected blocks'),
    meta: true,
  },
  {
    code: 'V',
    label: $t(
      'clipboardPasteShortcutHelp',
      'Paste text, image or copied blocks',
    ),
    meta: true,
  },
])

defineItemDropdownAction(() => {
  if (selection.items.value.length && state.editMode.value === 'editing') {
    return itemDropdownItems.value.map((item) => ({
      id: 'clipboard-' + item.id,
      label: item.label,
      icon: item.icon,
      description: item.description,
      enabled: item.enabled,
      group: 'clipboard',
      weight: 100,
      callback: () => {
        onSelectDropdownItem(item)
      },
    }))
  }
})

onMounted(() => {
  document.addEventListener('paste', onPaste)
  document.addEventListener('dragstart', onDragStart)
  document.addEventListener('dragenter', onDragEnter)
  document.addEventListener('dragleave', onDragLeave)
  document.addEventListener('dragend', resetDrag)
  document.addEventListener('dragover', onDragOver)
  document.addEventListener('drop', onNativeDrop)
})

onUnmounted(() => {
  document.removeEventListener('paste', onPaste)
  document.removeEventListener('dragstart', onDragStart)
  document.removeEventListener('dragenter', onDragEnter)
  document.removeEventListener('dragleave', onDragLeave)
  document.removeEventListener('dragend', resetDrag)
  document.removeEventListener('dragover', onDragOver)
  document.removeEventListener('drop', onNativeDrop)
})
</script>

<script lang="ts">
export default {
  name: 'Clipboard',
}
</script>

<style lang="postcss">
.bk-clipboard-drop-element {
  @apply pointer-events-none;
  @apply flex flex-col;
  @apply bg-white rounded-lg shadow-lg border border-mono-200;
  @apply overflow-hidden;
  width: 350px;
  height: 200px;

  .bk-clipboard-drop-element-header {
    @apply flex gap-10 p-15 font-semibold bg-mono-800 text-mono-100;
  }

  .bk-clipboard-drop-element-preview {
    @apply flex;
    @apply overflow-hidden;
    flex: 1;
    min-height: 0;

    .bk-clipboard-drop-element-item {
      @apply flex-1 min-w-0 relative overflow-hidden;
    }

    .bk-clipboard-drop-element-text {
      @apply p-8 text-xs font-sans text-mono-700 line-clamp-6 h-full;
    }

    img {
      @apply block w-full h-full object-cover;
    }

    .bk-clipboard-drop-element-file-icon {
      @apply flex items-center justify-center h-full bg-mono-100;

      svg {
        @apply size-24 fill-mono-400;
      }
    }

    .bk-clipboard-drop-element-item-label {
      @apply absolute bottom-0 left-0 right-0;
      @apply text-xs font-sans text-white leading-none truncate;
      @apply p-5;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
    }

    .bk-clipboard-item-video {
      @apply text-xs;
    }
  }
}

.bk-clipboard-drop-element-wrapper {
  @apply absolute pointer-events-none invisible;
}

.bk-clipboard-item-video {
  @apply relative aspect-video overflow-hidden border border-mono-300;
  @apply bg-mono-900 text-mono-50;
  img {
    @apply block object-cover absolute top-0 left-0 w-full h-full;
  }

  > div {
    @apply absolute z-30 left-0 w-full bottom-0 p-10;
    @apply bg-gradient-to-b from-mono-900/0 to-mono-900;
    svg {
      @apply size-20 fill-current;
    }

    p {
      @apply text-xs;
    }

    > div {
      @apply flex gap-5 font-bold;
    }
  }
}
</style>
