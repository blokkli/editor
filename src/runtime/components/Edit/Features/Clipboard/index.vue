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
    icon="clipboard"
    weight="-30"
  >
    <div class="bk-clipboard bk-control">
      <div
        v-if="!pastedItems.length"
        class="bk bk-clipboard-info bk-sidebar-padding"
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
            <Icon name="upload" />
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
} from '#imports'
import { PluginSidebar } from '#blokkli/plugins'
import ClipboardList from './List/index.vue'
import type { ClipboardItem } from '#blokkli/types'
import { falsy, generateUUID } from '#blokkli/helpers'
import { Icon } from '#blokkli/components'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import defineShortcut from '#blokkli/helpers/composables/defineShortcut'
import getVideoId from 'get-video-id'

const { settings, logger } = defineBlokkliFeature({
  id: 'clipboard',
  label: 'Clipboard',
  icon: 'clipboard',
  description:
    'Provides clipboard integration to copy/paste existing blocks or paste supported clipboard content like text or images.',
  settings: {
    openSidebarOnPaste: {
      type: 'checkbox',
      default: true,
      label: 'Open sidebar when pasting from clipboard',
      group: 'behavior',
    },
  },

  screenshot: 'feature-clipboard.jpg',
})

const { selection, $t, adapter, dom, state, ui } = useBlokkli()

const plugin = ref<InstanceType<typeof PluginSidebar> | null>(null)

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
    const attribute = element.attributes[i]
    if (!ALLOWED_HTML_ATTRIBUTES.includes(attribute.name)) {
      element.removeAttributeNode(element.attributes[i])
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
    const child = children[i]
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

const handleSelectionPaste = (pastedUuids: string[]) => {
  if (!adapter.pasteExistingBlocks) {
    return
  }
  // Pasting is only possible into a single field.
  if (selection.uuids.value.length !== 1) {
    return
  }

  if (!pastedUuids.length) {
    return
  }

  // @TODO: Paste into nested field if possible.
  const field = dom.getBlockField(selection.uuids.value[0])

  const pastedBlocks = pastedUuids
    .map((uuid) => dom.findBlock(uuid))
    .filter(falsy)
    .filter((block) => field.allowedBundles.includes(block.itemBundle))

  if (!pastedBlocks.length) {
    return
  }

  const count = state.getFieldBlockCount(field.key)
  if (
    field.cardinality !== -1 &&
    count + pastedBlocks.length > field.cardinality
  ) {
    return
  }

  state.mutateWithLoadingState(() =>
    adapter.pasteExistingBlocks!({
      uuids: pastedBlocks.map((v) => v.uuid),
      host: {
        type: field.hostEntityType,
        uuid: field.hostEntityUuid,
        fieldName: field.name,
      },
      preceedingUuid: selection.uuids.value[0],
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
  // Stop data actually being pasted into div
  e.stopPropagation()
  e.preventDefault()

  if (state.isLoading.value) {
    return
  }

  // Get pasted data via clipboard API
  const clipboardData = e.clipboardData
  if (clipboardData?.files.length) {
    return handleFiles(clipboardData)
  }
  let pastedData = clipboardData?.getData('text/html')
  if (!pastedData) {
    pastedData = clipboardData?.getData('text')
  }
  if (!pastedData) {
    return
  }

  if (pastedData.startsWith('{')) {
    try {
      const data = JSON.parse(pastedData)
      if (typeof data === 'object' && data.type && data.type === 'selection') {
        const uuids: string[] = data.uuids
        return handleSelectionPaste(uuids)
      }
    } catch (_e) {
      // Noop.
    }
  }

  handlePastedText(pastedData)
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

onBlokkliEvent('keyPressed', (e) => {
  if (!selection.blocks.value.length) {
    return
  }
  if (e.code !== 'c' || !e.meta) {
    return
  }
  setClipboard(
    JSON.stringify({ type: 'selection', uuids: selection.uuids.value }),
  )
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
