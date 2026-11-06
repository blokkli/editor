<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <div class="bk absolute pointer-events-none invisible">
      <DropElement
        ref="dropElementRef"
        :bundles="directDropBundles"
        :items="dropItems"
      />
    </div>
  </Teleport>

  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <UploadDialog
        v-if="uploadDialog"
        :files="uploadDialog.files"
        :title="uploadDialog.title"
        :submit-label="uploadDialog.submitLabel"
        @done="closeUploadDialog"
        @cancel="closeUploadDialog(null)"
      >
        <template #default="{ types }">
          <UploadBundles
            v-model="uploadBundles"
            :groups="uploadDialog.groups"
            :types
          />
        </template>
      </UploadDialog>
    </BlokkliTransition>
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
  shallowRef,
  useTemplateRef,
  defineAsyncComponent,
} from '#imports'
import { onlyUnique } from '#blokkli/helpers'
import { BlokkliTransition } from '#blokkli/editor/components'
import { generateUUID } from '#blokkli/editor/helpers/uuid'
import { parseHtml } from '#blokkli/editor/helpers/html'
import type getVideoIdSync from 'get-video-id'
import type { DropElementItem } from './DropElement/index.vue'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { emitMessage } from '#blokkli/editor/events'
import {
  defineDropAreas,
  defineDropHandler,
  defineItemDropdownAction,
  defineShortcut,
  onBlokkliEvent,
} from '#blokkli/editor/composables'
import {
  getUploadFileInfo,
  getUploadType,
} from '#blokkli/editor/helpers/uploads'
import type { UploadedMedia, UploadType } from '#blokkli/editor/types/uploads'
import {
  getReplaceMediaTargets,
  type ReplaceMediaTarget,
} from '#blokkli/editor/features/media-library/helpers'
import UploadBundles from './UploadBundles/index.vue'
import type {
  BlokkliClipboardItem,
  ClipboardFileGroup,
  DraggableNativeDropItem,
} from './types'
import {
  buildFileMapEvent,
  buildMapBundleEvents,
  cleanPastedHtml,
  groupFileBundles,
  narrowFileGroups,
} from './helpers'
import type {
  BlokkliFieldElement,
  RenderedFieldListItem,
} from '#blokkli/editor/types/field'
import type { DraggableExistingBlock } from '#blokkli/editor/types/draggable'
import type { DropAreaDropOptions } from '#blokkli/editor/types/ui'
import { parseClipboardEnvelope } from '#blokkli/editor/types/clipboard'

const DropElement = defineAsyncComponent(
  () => import('./DropElement/index.vue'),
)

const UploadDialog = defineAsyncComponent(
  () => import('#blokkli/editor/components/UploadDialog/index.vue'),
)

async function getVideoId(
  url: string,
): Promise<ReturnType<typeof getVideoIdSync>> {
  const { default: fn } = await import('get-video-id')
  return fn(url)
}

const { logger } = defineBlokkliFeature({
  id: 'clipboard',
  label: 'Clipboard',
  icon: 'bk_mdi_content_paste',
  description:
    'Provides clipboard integration to copy/paste existing blocks or paste supported clipboard content like text or images.',

  screenshot: 'feature-clipboard.jpg',
})

const app = useBlokkli()
const {
  selection,
  $t,
  adapter,
  state,
  ui,
  blocks,
  eventBus,
  animation,
  context,
  permissions,
} = app

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

/**
 * The bundles all lists have.
 */
function intersectBundles(lists: string[][]): string[] {
  return lists.reduce((common, bundles) =>
    common.filter((b) => bundles.includes(b)),
  )
}

/**
 * Whether files are uploaded in the upload dialog, where their media's fields
 * are filled in. Otherwise each file is read and added on its own.
 */
function canUploadFiles(): boolean {
  return !!(
    adapter.uploadFile &&
    adapter.getUploadForm &&
    adapter.createMediaFromUploads &&
    adapter.addBlocksFromUploads
  )
}

/**
 * Whether a file dropped on a block's media is uploaded in the upload dialog,
 * to replace the media.
 */
function canUploadMedia(): boolean {
  return !!(
    adapter.getUploadMediaBundle &&
    adapter.uploadFile &&
    adapter.getUploadForm &&
    adapter.createMediaFromUploads
  )
}

/**
 * Start dragging the drop element, which shows the items.
 */
function startDrag(
  item: Omit<DraggableNativeDropItem, 'itemType' | 'element' | 'dataTransfer'>,
  items: DropElementItem[],
  coords: { x: number; y: number },
) {
  if (!dropElementRef.value) {
    return
  }

  directDropBundles.value = item.itemBundles
  dropItems.value = items
  positionDropElement(coords.x, coords.y)

  const el = dropElementRef.value.$el as HTMLElement

  nativeDropItem = {
    ...item,
    itemType: 'native_drop',
    dataTransfer: null,
    element: () => el,
  }

  isDirectDrop.value = true

  eventBus.emit('dragging:start', {
    items: [nativeDropItem],
    coords,
    mode: 'mouse',
  })
}

function startClipboardDrag(
  item: BlokkliClipboardItem,
  bundles?: string[],
  allItems?: BlokkliClipboardItem[],
) {
  if (
    !adapter.clipboardMapBundle ||
    !adapter.addBlockFromClipboardItem ||
    state.editMode.value !== 'editing'
  ) {
    return
  }

  const itemBundles = bundles || [item.itemBundle]
  if (!itemBundles.length) {
    return
  }

  const items = allItems || [item]
  startDrag(
    { itemBundles, blockCount: items.length, clipboardItems: items },
    items.map((v) => ({
      type: v.type,
      data: v.data,
      fileName: 'fileName' in v ? v.fileName : undefined,
      fileSize: 'fileSize' in v ? v.fileSize : undefined,
      videoId: 'videoId' in v ? v.videoId : undefined,
      videoService: 'videoService' in v ? v.videoService : undefined,
    })),
    animation.getMouseCoords(),
  )
}

// The pasted images' object URLs, shown while they're dragged.
let previewUrls: string[] = []

function revokePreviewUrls() {
  previewUrls.forEach((url) => URL.revokeObjectURL(url))
  previewUrls = []
}

/**
 * Start dragging files to upload: each type with its own bundles.
 */
function startUploadDrag(files: File[], groups: ClipboardFileGroup[]) {
  if (state.editMode.value !== 'editing') {
    return
  }

  revokePreviewUrls()
  const itemBundleGroups = groups.map((group) => group.bundles)
  startDrag(
    {
      itemBundles: itemBundleGroups.flat().filter(onlyUnique),
      itemBundleGroups,
      blockCount: files.length,
      files,
      uploads: files.map(getUploadFileInfo),
    },
    files.map((file) => {
      const type = getUploadType(file.type)
      const data = type === 'image' ? URL.createObjectURL(file) : undefined
      if (data) {
        previewUrls.push(data)
      }
      return { type, data, fileName: file.name, fileSize: file.size }
    }),
    animation.getMouseCoords(),
  )
}

/**
 * Map each file to its bundles. Returns null if a file has none, after saying
 * which.
 */
function mapFileBundles(
  files: File[],
): Array<{ type: UploadType; bundles: string[] }> | null {
  const mapped: Array<{ type: UploadType; bundles: string[] }> = []
  for (const file of files) {
    const bundles = normalizeBundles(
      adapter.clipboardMapBundle?.(buildFileMapEvent(file)),
    )
    if (!bundles) {
      emitUnsupportedFile(file)
      return null
    }
    mapped.push({ type: getUploadType(file.type), bundles })
  }
  return mapped
}

/**
 * The groups of files to upload, with the bundles the field allows and the
 * user may add. Returns null if a group has none.
 */
function getUploadGroups(
  files: File[],
  field: BlokkliFieldElement,
): ClipboardFileGroup[] | null {
  const mapped = mapFileBundles(files)
  if (!mapped) {
    return null
  }
  return narrowFileGroups(
    groupFileBundles(mapped),
    (bundle) =>
      field.allowedBundles.includes(bundle) &&
      permissions.checkBlockBundlePermission(bundle, 'add'),
  )
}

type UploadDialogOptions = {
  /**
   * The bundles each type of file can be added with, if blocks are added.
   */
  groups?: ClipboardFileGroup[]
  title?: string
  submitLabel?: string
}

// The upload dialog, while files are uploaded and their media created.
const uploadDialog = shallowRef<
  (UploadDialogOptions & { files: File[]; groups: ClipboardFileGroup[] }) | null
>(null)

// The bundle of each type's blocks: the first, unless another is picked.
const uploadBundles = ref<Partial<Record<UploadType, string>>>({})

let resolveUploadDialog: ((media: UploadedMedia[] | null) => void) | null = null

/**
 * Show the upload dialog. Resolves with the files' media, or null if it's
 * cancelled.
 */
function showUploadDialog(
  files: File[],
  options: UploadDialogOptions = {},
): Promise<UploadedMedia[] | null> {
  return new Promise((resolve) => {
    const groups = options.groups ?? []
    resolveUploadDialog = resolve
    uploadBundles.value = Object.fromEntries(
      groups.map((group) => [group.type, group.bundles[0]]),
    )
    uploadDialog.value = { ...options, files, groups }
  })
}

function closeUploadDialog(media: UploadedMedia[] | null) {
  uploadDialog.value = null
  resolveUploadDialog?.(media)
  resolveUploadDialog = null
}

/**
 * The files of a drop. Read when they're dropped: the drop's DataTransfer is
 * empty once its event is handled.
 */
function getDroppedFiles(item: DraggableNativeDropItem): File[] {
  if (item.dataTransfer?.files.length) {
    item.files = [...item.dataTransfer.files]
  }
  return item.files ?? []
}

/**
 * Upload a dropped file and replace a field's media with its media.
 */
async function replaceMediaWithFile(
  item: DraggableNativeDropItem,
  mediaBundle: string,
  target: ReplaceMediaTarget,
  options: DropAreaDropOptions,
) {
  const file = getDroppedFiles(item)[0]
  if (!file) {
    return
  }
  // Checked again with the file's name and size, unknown while it's dragged.
  if (adapter.getUploadMediaBundle?.(getUploadFileInfo(file)) !== mediaBundle) {
    emitUnsupportedFile(file)
    return
  }
  const media = await showUploadDialog([file], {
    title: target.label,
    submitLabel: $t('clipboardUploadReplace', 'Replace'),
  })
  if (media?.[0]) {
    await target.replace(media[0].mediaId, options)
  }
}

// ---------------------------------------------------------------------------
// Native drag (file/text from OS).
// ---------------------------------------------------------------------------
function tryStartDirectDrop(e: DragEvent): boolean {
  if (
    !adapter.clipboardMapBundle ||
    state.editMode.value !== 'editing' ||
    !dropElementRef.value
  ) {
    return false
  }

  const mapEvents = buildMapBundleEvents(e)
  if (!mapEvents.length) {
    return false
  }

  const mapped: string[][] = []
  for (const mapEvent of mapEvents) {
    const bundles = normalizeBundles(adapter.clipboardMapBundle(mapEvent))
    if (!bundles) {
      return false
    }
    mapped.push(bundles)
  }

  let item: Pick<
    DraggableNativeDropItem,
    'itemBundles' | 'itemBundleGroups' | 'uploads'
  >
  if (mapEvents[0]!.type !== 'plaintext' && canUploadFiles()) {
    // Each type of file is uploaded and added with its own bundle.
    const groups = groupFileBundles(
      mapEvents.map((mapEvent, i) => ({
        type: mapEvent.type === 'image' ? 'image' : 'file',
        bundles: mapped[i]!,
      })),
    )
    if (groups.some((group) => !group.bundles.length)) {
      return false
    }
    const itemBundleGroups = groups.map((group) => group.bundles)
    item = {
      itemBundles: itemBundleGroups.flat().filter(onlyUnique),
      itemBundleGroups,
      // A file's name and size are only known once it's dropped.
      uploads: mapEvents.flatMap((mapEvent) =>
        mapEvent.type === 'plaintext'
          ? []
          : [
              {
                type: mapEvent.type,
                fileType: mapEvent.fileType,
                fileSize: mapEvent.fileSize || undefined,
                fileName: mapEvent.fileName,
              },
            ],
      ),
    }
  } else {
    if (!adapter.addBlockFromClipboardItem) {
      return false
    }
    // Every dragged file is added with the same bundle.
    const bundles = intersectBundles(mapped)
    if (!bundles.length) {
      return false
    }
    item = { itemBundles: bundles }
  }

  // During native drag we only know the type and maybe file name — no data yet.
  startDrag(
    { ...item, blockCount: mapEvents.length },
    mapEvents.map((mapEvent) => ({
      type: mapEvent.type === 'plaintext' ? 'text' : mapEvent.type,
      fileName: 'fileName' in mapEvent ? mapEvent.fileName : undefined,
    })),
    { x: e.clientX, y: e.clientY },
  )

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
  if (ui.hasDialogOpen.value || ui.isApproving.value) {
    return
  }

  if (isDragFromInput) {
    isDragFromInput = false
    return
  }

  if (isDirectDrop.value && nativeDropItem && e.dataTransfer) {
    nativeDropItem.dataTransfer = e.dataTransfer
    // Read the files now: a drop area may ask a question first, and the
    // DataTransfer is empty once this event is handled. A test's
    // DataTransfer stays readable, so E2E tests can't tell.
    getDroppedFiles(nativeDropItem)
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
  if (!adapter.clipboardMapBundle) {
    return
  }

  const files = data instanceof DataTransfer ? [...data.files] : [...data]
  if (!files.length) {
    return
  }

  const mapped = mapFileBundles(files)
  if (!mapped) {
    return
  }

  if (canUploadFiles()) {
    // Each type of file is uploaded and added with its own bundle.
    const groups = groupFileBundles(mapped)
    if (groups.some((group) => !group.bundles.length)) {
      emitNoCommonBundle()
      return
    }
    startUploadDrag(files, groups)
    return
  }

  if (!FileReader) {
    return
  }

  // Intersect to find common bundles: every file is added with the same one.
  const commonBundles = intersectBundles(mapped.map((v) => v.bundles))

  if (!commonBundles.length) {
    emitNoCommonBundle()
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
    items.push({
      type: getUploadType(file.type),
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

function emitNoCommonBundle() {
  emitPasteError(
    $t('clipboardNoCommonBundle', 'No common block type for these files.'),
  )
}

function emitUnsupportedFile(file: File) {
  emitPasteError(
    $t(
      'uploadUnsupportedFile',
      'The type or size of "@name" is not supported.',
    ).replace('@name', file.name),
  )
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
  if (!pastedUuids.length) return
  const existingBlocks = pastedUuids
    .map((uuid) => blocks.getBlock(uuid))
    .filter((block): block is RenderedFieldListItem => !!block)
  if (!existingBlocks.length) return
  startCopyDrag(existingBlocks)
}

function onPaste(e: ClipboardEvent) {
  logger.log('Paste Event', e)
  if (state.editMode.value !== 'editing' || ui.hasDialogOpen.value) {
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
        const payload = parseClipboardEnvelope(JSON.parse(pastedData))
        if (payload) {
          eventBus.emit('clipboard:paste', payload)
          return
        }
      } catch (_e) {
        // Noop.
      }
    }
    handlePastedText(pastedData)
  }
}

const handlePastedText = async (text: string) => {
  if (!adapter.clipboardMapBundle) {
    return
  }
  const video = await getVideoId(text)
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

  const div = parseHtml(text.replace(/&nbsp;|<br>/g, ''))

  cleanPastedHtml(div)
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

// A single file can be dropped on a block's media, to replace it.
defineDropAreas((dragItems) => {
  const item = dragItems[0]
  if (
    dragItems.length !== 1 ||
    item?.itemType !== 'native_drop' ||
    item.uploads?.length !== 1 ||
    !canUploadMedia()
  ) {
    return
  }

  const mediaBundle = adapter.getUploadMediaBundle!(item.uploads[0]!)
  if (!mediaBundle) {
    return
  }

  return getReplaceMediaTargets(app, mediaBundle).map((target) => ({
    id: target.id,
    label: target.label,
    element: target.element,
    icon: 'bk_mdi_swap_horiz',
    // Asked at the drop, before the upload dialog opens.
    askLanguages: target.askLanguages,
    // The drag ends with the drop, before the dialog closes.
    onDrop: (options: DropAreaDropOptions) => {
      replaceMediaWithFile(item, mediaBundle, target, options)
    },
  }))
})

defineDropHandler('native_drop', {
  async resolveBundles({ items, field }) {
    const item = items[0]!

    // Eagerly extract File objects since DataTransfer will be invalidated
    // after this synchronous handler returns (e.g. while bundle selector is
    // shown).
    getDroppedFiles(item)

    // Files to upload: each type is added with a bundle of its own, picked in
    // the upload dialog. One is enough to skip the bundle selector.
    if (item.files?.length && canUploadFiles()) {
      const groups = getUploadGroups(item.files, field)
      return groups ? [groups[0]!.bundles[0]!] : []
    }

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
    if (item.files?.length) {
      if (!adapter.clipboardMapBundle) {
        return field.allowedBundles.filter((b) => item.itemBundles.includes(b))
      }
      const mapped = mapFileBundles(item.files)
      if (!mapped) {
        return []
      }
      return intersectBundles(mapped.map((v) => v.bundles)).filter((b) =>
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
      const video = await getVideoId(text)
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

  async execute({ items, host, afterUuid, bundle, field }) {
    const item = items[0]!

    // Files to upload: the upload dialog creates their media, then a block is
    // added for each.
    if (item.files?.length && canUploadFiles()) {
      const groups = getUploadGroups(item.files, field)
      if (!groups) {
        return
      }
      const media = await showUploadDialog(item.files, { groups })
      if (media) {
        await state.mutateWithLoadingState(() =>
          adapter.addBlocksFromUploads!({
            items: media.map((v) => ({
              ...v,
              bundle: uploadBundles.value[v.type]!,
            })),
            host,
            afterUuid,
          }),
        )
      }
      return
    }

    if (!adapter.addBlockFromClipboardItem) {
      return
    }

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
      if (adapter.clipboardMapBundle && !mapFileBundles(files)) {
        return
      }

      let results: string[]
      try {
        results = await Promise.all(files.map(readFileAsDataURL))
      } catch {
        return
      }

      const clipboardItems: BlokkliClipboardItem[] = files.map((file, i) => {
        return {
          type: getUploadType(file.type),
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

function copyCurrentSelectionToClipboard() {
  if (!selection.items.value.length) {
    selectionClipboard.value = []
    return
  }

  ui.setClipboardData({
    type: 'selection',
    uuids: selection.uuids.value,
  })
  selectionClipboard.value = selection.uuids.value
}

onBlokkliEvent('clipboard:paste', ({ meta, data }) => {
  if (data.type !== 'selection') return
  // Selection UUIDs are scoped to a host entity — they only resolve
  // back to real blocks on the page they were copied from.
  if (meta.hostUuid !== context.value.entityUuid) return
  if (!Array.isArray(data.uuids)) return
  const uuids = data.uuids.filter((u): u is string => typeof u === 'string')
  handleSelectionPaste(uuids)
})

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
  revokePreviewUrls()
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
