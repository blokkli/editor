<template>
  <PluginSidebar
    v-if="adapter.addBlockFromClipboardItem"
    id="clipboard"
    ref="plugin"
    :title="$t('clipboard', 'Clipboard')"
    :tour-text="
      $t(
        'clipboardTourText',
        'Drag and drop content pasted from your clipboard into the page to create a matching block.',
      )
    "
    edit-only
    icon="bk_mdi_content_paste"
    weight="-30"
  >
    <div class="bk bk-clipboard bk-control">
      <div
        v-if="!pastedItems.length"
        class="bk-clipboard-info bk-sidebar-padding"
      >
        <h4>{{ $t('clipboardEmpty', 'No items in the clipboard') }}</h4>
        <div
          v-if="!ui.isMobile.value"
          v-html="
            $t(
              'clipboardExplanation',
              `<p>
    Use Ctrl-V on the page to paste content. These
    will then be displayed here.
  </p>
  <p>
    Use Ctrl-F to search for existing content and paste it into
    the clipboard.
  </p>`,
            )
          "
        />
      </div>
      <ClipboardList
        v-if="pastedItems.length"
        :items="pastedItems"
        @remove="remove"
      />
      <div class="bk-clipboard-form bk-sidebar-padding">
        <div class="bk-clipboard-input">
          <input
            type="text"
            class="bk-form-input"
            :placeholder="
              $t('clipboardPastePlaceholder', 'Paste text or media here')
            "
            @paste.stop.prevent="onManualPaste"
            @keydown.stop
          />
        </div>
        <div class="bk-clipboard-upload">
          <input type="file" @change="onFileInput" />
          <div class="bk-button bk-is-primary">
            <Icon name="bk_mdi_upload" />
          </div>
        </div>
      </div>
    </div>
  </PluginSidebar>
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
import { PluginSidebar } from '#blokkli/editor/plugins'
import ClipboardList from './List/index.vue'
import type { ClipboardItem, RenderedFieldListItem } from '#blokkli/types'
import { falsy, generateUUID, getFieldKey } from '#blokkli/helpers'
import { Icon } from '#blokkli/components'
import getVideoId from 'get-video-id'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { emitMessage } from '#blokkli/editor/events'
import { itemEntityType } from '#blokkli-build/config'
import { defineItemDropdownAction, defineShortcut, onBlokkliEvent } from '#blokkli/editor/composables'

const { settings, logger } = defineBlokkliFeature({
  id: 'clipboard',
  label: 'Clipboard',
  icon: 'bk_mdi_content_paste',
  description:
    'Provides clipboard integration to copy/paste existing blocks or paste supported clipboard content like text or images.',
  settings: {
    openSidebarOnPaste: {
      type: 'checkbox',
      default: true,
      label: 'Open sidebar when pasting',
      description:
        'Automatically opens the sidebar when pasting content from the clipboard.',
      group: 'behavior',
    },
  },

  screenshot: 'feature-clipboard.jpg',
})

const { selection, $t, adapter, state, ui, types, keyboard, blocks, fields } =
  useBlokkli()

const plugin = useTemplateRef('plugin')
const selectionClipboard = ref<string[]>([])

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

const ALLOWED_HTML_ATTRIBUTES = ['href']

const _MOCK: ClipboardItem[] = [
  {
    type: 'text',
    id: generateUUID(),
    itemBundle: 'text',
    data: 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.',
  },
  {
    type: 'file',
    id: generateUUID(),
    itemBundle: 'image',
    data: 'asdfasdf',
    additional: 'asdfasdfasdf',
    fileName: 'my-little-document.pdf',
    fileSize: 26624,
    fileType: 'application/pdf',
  },
  {
    type: 'file',
    id: generateUUID(),
    itemBundle: 'image',
    data: 'asdfasdf',
    additional: 'asdfasdfasdf',
    fileName: 'my-little-document.pdf',
    fileSize: 36623,
    fileType: 'application/pdf',
  },
  {
    type: 'video',
    id: generateUUID(),
    itemBundle: 'video',
    data: 'https://vimeo.com/53520224',
    videoService: 'vimeo',
    videoId: '53520224',
  },
  {
    type: 'video',
    id: generateUUID(),
    itemBundle: 'video',
    data: 'https://www.youtube.com/watch?v=zsvYVVRAk0c',
    videoService: 'youtube',
    videoId: 'zsvYVVRAk0c',
  },
]

const pastedItems = ref<ClipboardItem[]>([])

const onFileInput = (e: Event) => {
  e.preventDefault()
  if (e.target instanceof HTMLInputElement) {
    const files = e.target.files
    if (files) {
      handleFiles(files)
    }
  }
}

function removeAllAttrs(element: Element) {
  for (let i = element.attributes.length; i-- > 0; ) {
    const attribute = element.attributes[i]!
    if (!ALLOWED_HTML_ATTRIBUTES.includes(attribute.name)) {
      element.removeAttributeNode(attribute)
    }
  }
}

function removeAttributes(el: Element) {
  if (el.tagName === 'IMG' || el.tagName === 'BR') {
    el.remove()
    return
  }
  const children = el.children
  for (let i = 0; i < children.length; i++) {
    const child = children[i]!
    removeAllAttrs(child)
    if (child.children.length) {
      removeAttributes(child)
    }
  }
}

const onManualPaste = (e: ClipboardEvent) => {
  onPaste(e, true)
}

function handleFiles(data: DataTransfer | FileList) {
  if (!FileReader) {
    return
  }

  const files = data instanceof DataTransfer ? [...data.files] : [...data]

  files.forEach((file) => {
    const fr = new FileReader()
    fr.onload = function () {
      if (!adapter.clipboardMapBundle) {
        return
      }

      if (typeof fr.result !== 'string') {
        return
      }

      const type: 'image' | 'file' = file.type.startsWith('image/')
        ? 'image'
        : 'file'

      // Let the adapter decide which block bundle can be created from this clipboard item.
      const itemBundle = adapter.clipboardMapBundle({
        type,
        fileType: file.type,
        fileSize: file.size,
      })

      if (!itemBundle) {
        return
      }

      pastedItems.value.push({
        type,
        itemBundle,
        id: generateUUID(),
        data: fr.result,
        additional: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileName: file.name,
      })
      showClipboardSidebar()
    }
    fr.readAsDataURL(file)
  })
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer?.files.length) {
    handleFiles(e.dataTransfer)
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
}

const showClipboardSidebar = () => {
  if (settings.value.openSidebarOnPaste) {
    plugin?.value?.showSidebar()
  }
}

function emitPasteError(message: string) {
  const prefix = $t('clipboardPasteError', 'Failed to paste:')
  emitMessage(`${prefix} ${message}`, 'error')
}

const handleSelectionPaste = (pastedUuids: string[]) => {
  if (!adapter.pasteExistingBlocks) {
    return
  }

  // Pasting is only possible into a single field.
  if (selection.uuids.value.length !== 1) {
    emitPasteError(
      $t(
        'clipboardPasteErrorOneField',
        'Pasting is only possible into one field at a time.',
      ),
    )
    return
  }

  if (!pastedUuids.length) {
    return
  }

  const block = selection.items.value[0]
  if (!block) {
    return
  }

  let targetField = null
  let targetFieldElement = null
  let targetFieldKey = null
  let preceedingUuid: string | null = null

  // Only try to paste into nested fields if Shift is not pressed
  if (!keyboard.isPressingShift.value) {
    // Get bundles and fragments of pasted blocks first
    const pastedBundles = pastedUuids
      .map((uuid) => blocks.getBlock(uuid)?.bundle)
      .filter((bundle): bundle is string => !!bundle)

    const pastedFragments = pastedUuids
      .map((uuid) => {
        const block = blocks.getBlock(uuid)
        if (block?.bundle === 'blokkli_fragment' && block.fragment?.name) {
          return block.fragment.name
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

  // If no suitable nested field found, use the parent field (existing logic)
  if (!targetField || !targetFieldElement || !targetFieldKey) {
    const field = state.getMutatedField(block.host.uuid, block.host.fieldName)
    if (!field) {
      return
    }

    const fieldElement = fields.find(field.entityUuid, field.name)
    if (!fieldElement) {
      return
    }

    targetField = {
      entityType: field.entityType,
      entityUuid: field.entityUuid,
      name: field.name,
    }
    targetFieldElement = fieldElement
    targetFieldKey = getFieldKey(field.entityUuid, field.name)
    preceedingUuid = selection.uuids.value[0] ?? null
  }

  const pastedBlocks: RenderedFieldListItem[] = []
  const notAllowedBundles: string[] = []
  const notAllowedFragments: string[] = []

  for (let i = 0; i < pastedUuids.length; i++) {
    const uuid = pastedUuids[i]
    if (!uuid) {
      continue
    }
    const block = blocks.getBlock(uuid)
    if (!block) {
      continue
    }
    const isAllowed = targetFieldElement.allowedBundles.includes(block.bundle)
    if (!isAllowed) {
      notAllowedBundles.push(block.bundle)
      continue
    }

    // Check fragment restrictions for blokkli_fragment bundles
    if (
      block.bundle === 'blokkli_fragment' &&
      block.fragment?.name &&
      targetFieldElement.allowedFragments.length > 0
    ) {
      const fragmentAllowed = targetFieldElement.allowedFragments.includes(
        block.fragment.name,
      )
      if (!fragmentAllowed) {
        notAllowedFragments.push(block.fragment.name)
        continue
      }
    }

    pastedBlocks.push(block)
  }

  if (!pastedBlocks.length) {
    if (notAllowedFragments.length) {
      const message =
        notAllowedFragments.length === 1
          ? $t(
              'clipboardPasteErrorAllowedFragmentsSingle',
              'Fragment "@types" is not allowed here.',
            )
          : $t(
              'clipboardPasteErrorAllowedFragmentsMultiple',
              'Fragments (@types) are not allowed here.',
            )
      emitPasteError(message.replace('@types', notAllowedFragments.join(', ')))
      return
    }

    const blockTypes = notAllowedBundles.map((bundle) => {
      return types.getBlockBundleDefinition(bundle)?.label ?? bundle
    })
    const message =
      blockTypes.length === 1
        ? $t(
            'clipboardPasteErrorAllowedBundlesSingle',
            'Block type "@types" is not allowed here.',
          )
        : $t(
            'clipboardPasteErrorAllowedBundlesMultiple',
            'Block types (@types) are not allowed here.',
          )
    emitPasteError(message.replace('@types', blockTypes.join(', ')))
    return
  }

  const count = state.getFieldBlockCount(targetFieldKey)
  if (
    targetFieldElement.cardinality !== -1 &&
    count + pastedBlocks.length > targetFieldElement.cardinality
  ) {
    emitPasteError(
      $t(
        'clipboardPasteErrorCardinality',
        'This field only allows up to @count blocks.',
      ).replace('@count', targetFieldElement.cardinality.toString()),
    )
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

function onPaste(e: ClipboardEvent, fromInput?: boolean) {
  logger.log('Paste Event', e)
  if (state.editMode.value !== 'editing') {
    return
  }
  if (
    !fromInput &&
    (e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement)
  ) {
    return
  }

  // Stop data actually being pasted into div.
  e.stopPropagation()
  e.preventDefault()

  if (state.isLoading.value) {
    return
  }

  const clipboardData = e.clipboardData
  if (!clipboardData) {
    return
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

  if (clipboardData.files.length) {
    return handleFiles(clipboardData)
  }
}

const handlePastedText = (text: string) => {
  if (!adapter.clipboardMapBundle) {
    return
  }
  const video = getVideoId(text)
  if (video.id && video.service) {
    const itemBundle = adapter.clipboardMapBundle({
      type: 'video',
      videoService: video.service,
      videoId: video.id,
    })
    if (!itemBundle) {
      return
    }
    pastedItems.value.push({
      type: 'video',
      id: generateUUID(),
      itemBundle,
      data: text,
      videoService: video.service,
      videoId: video.id,
    })
    showClipboardSidebar()
    return
  }

  const div = document.createElement('div')
  div.innerHTML = text.replace(/&nbsp;|<br>/g, '')

  removeAttributes(div)
  if (div.textContent) {
    const itemBundle = adapter.clipboardMapBundle({
      type: 'plaintext',
      text: div.innerHTML,
    })
    if (!itemBundle) {
      return
    }
    showClipboardSidebar()
    pastedItems.value.push({
      type: 'text',
      id: generateUUID(),
      itemBundle,
      data: div.innerHTML,
    })
  }
}

function remove(index: number) {
  pastedItems.value = pastedItems.value.filter((_v, i) => {
    return i !== index
  })
}

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
  if (e.code !== 'c' || !e.meta || ui.hasDialogOpen.value) {
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

onBlokkliEvent('drop:clipboardItem', async (data) => {
  const item = pastedItems.value.find((v) => v.id === data.id)
  if (!item) {
    return
  }
  if (adapter.addBlockFromClipboardItem) {
    await state.mutateWithLoadingState(() =>
      adapter.addBlockFromClipboardItem!({
        afterUuid: data.afterUuid,
        item: item,
        blockBundle: data.blockBundle,
        host: data.host,
      }),
    )

    // Remove the pasted item.
    pastedItems.value = pastedItems.value.filter((v) => v.id !== item.id)
  }
})

onMounted(() => {
  document.addEventListener('paste', onPaste)
  document.body.addEventListener('drop', onDrop)
  document.addEventListener('dragover', onDragOver)
})

onUnmounted(() => {
  document.removeEventListener('paste', onPaste)
  document.body.removeEventListener('drop', onDrop)
  document.removeEventListener('dragover', onDragOver)
})
</script>

<script lang="ts">
export default {
  name: 'Clipboard',
}
</script>
