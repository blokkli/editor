<template>
  <PluginSidebar
    id="clipboard"
    ref="plugin"
    :title="$t('clipboard')"
    edit-only
    icon="clipboard"
    weight="-30"
  >
    <div class="bk-clipboard bk-control">
      <div
        v-if="!pastedItems.length"
        class="bk bk-clipboard-info bk-sidebar-padding"
      >
        <h4>{{ $t('clipboardEmpty') }}</h4>
        <div v-if="!ui.isMobile.value" v-html="$t('clipboardExplanation')" />
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
            :placeholder="$t('clipboardPastePlaceholder')"
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
import { ref, useBlokkli, onMounted, onUnmounted } from '#imports'

import { PluginSidebar } from '#blokkli/plugins'
import ClipboardList from './List/index.vue'
import type {
  KeyPressedEvent,
  SearchContentItem,
  ClipboardItem,
} from '#blokkli/types'
import { falsy } from '#blokkli/helpers'
import { Icon } from '#blokkli/components'

defineBlokkliFeature({
  id: 'clipboard',
  description:
    'Provides clipboard integration to copy/paste existing blocks or paste supported clipboard content like text or images.',
})

const { eventBus, selection, $t, adapter, dom, state, ui } = useBlokkli()

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

const onManualPaste = async (e: ClipboardEvent) => {
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

const showClipboardSidebar = () => plugin?.value?.showSidebar()

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

  const field = dom.getBlockField(selection.uuids.value[0])

  const pastedBlocks = pastedUuids
    .map((uuid) => dom.findBlock(uuid))
    .filter(falsy)
    .filter((block) => field.allowedBundles.includes(block.itemBundle))

  if (!pastedBlocks.length) {
    return
  }

  if (
    field.cardinality !== -1 &&
    field.blockCount + pastedBlocks.length > field.cardinality
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
  const youtubeId = getYouTubeID(text)

  if (youtubeId) {
    pastedItems.value.push({
      type: 'youtube',
      itemBundle: 'video_remote',
      data: youtubeId,
    })
    showClipboardSidebar()
    return
  }

  const div = document.createElement('div')
  div.innerHTML = text.replace(/(?:&nbsp;|<br>)/g, '')

  removeAttributes(div)
  if (div.innerText) {
    showClipboardSidebar()
    pastedItems.value.push({
      type: 'text',
      itemBundle: 'text',
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

function onKeyPressed(e: KeyPressedEvent) {
  if (!selection.blocks.value.length) {
    return
  }
  if (e.code !== 'c' || !e.meta) {
    return
  }
  setClipboard(
    JSON.stringify({ type: 'selection', uuids: selection.uuids.value }),
  )
}

function onSelectContentItem(item: SearchContentItem) {
  item.targetBundles.forEach((bundle) => {
    pastedItems.value.push({
      type: 'search_content',
      itemBundle: bundle,
      data: item.title.replace(/<\/?[^>]+(>|$)/g, ''),
      item,
    })
  })

  showClipboardSidebar()
}

onMounted(() => {
  eventBus.on('keyPressed', onKeyPressed)
  eventBus.on('search:selectContentItem', onSelectContentItem)
  document.addEventListener('paste', onPaste)
  document.body.addEventListener('drop', onDrop)
  document.addEventListener('dragover', onDragOver)
})

onUnmounted(() => {
  eventBus.off('keyPressed', onKeyPressed)
  eventBus.off('search:selectContentItem', onSelectContentItem)
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
