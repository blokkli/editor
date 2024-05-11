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
import { falsy } from '#blokkli/helpers'
import { Icon } from '#blokkli/components'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import defineShortcut from '#blokkli/helpers/composables/defineShortcut'

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

function getYouTubeID(url: string): string | null {
  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[7].length === 11 ? match[7] : null
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

const TYPES_IMAGE = ['image/jpeg', 'image/png', 'image/jpg']

function handleFiles(data: DataTransfer | FileList) {
  if (!FileReader) {
    return
  }

  const files = data instanceof DataTransfer ? [...data.files] : [...data]

  files.forEach((file) => {
    const fr = new FileReader()
    fr.onload = function () {
      if (typeof fr.result === 'string') {
        if (TYPES_IMAGE.includes(file.type)) {
          pastedItems.value.push({
            type: 'image',
            itemBundle: 'image',
            data: fr.result,
            additional: file.name,
          })
          showClipboardSidebar()
        }
      }
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

  state.mutateWithLoadingState(
    adapter.pasteExistingBlocks({
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
  const youtubeId = getYouTubeID(text)

  if (youtubeId) {
    const itemBundle = adapter.clipboardMapBundle({
      type: 'youtube_video',
      data: text,
    })
    if (!itemBundle) {
      return
    }
    pastedItems.value.push({
      type: 'youtube',
      itemBundle,
      data: youtubeId,
    })
    showClipboardSidebar()
    return
  }

  const div = document.createElement('div')
  div.innerHTML = text.replace(/(?:&nbsp;|<br>)/g, '')

  removeAttributes(div)
  if (div.innerText) {
    const itemBundle = adapter.clipboardMapBundle({
      type: 'plaintext',
      data: div.innerHTML,
    })
    if (!itemBundle) {
      return
    }
    showClipboardSidebar()
    pastedItems.value.push({
      type: 'text',
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

onBlokkliEvent('search:selectContentItem', (item) => {
  item.targetBundles.forEach((bundle) => {
    pastedItems.value.push({
      type: 'search_content',
      itemBundle: bundle,
      data: item.title.replace(/<\/?[^>]+(>|$)/g, ''),
      item,
    })
  })

  showClipboardSidebar()
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
