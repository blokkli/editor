<template>
  <PluginSidebar id="clipboard" title="Zwischenablage" edit-only>
    <template #icon>
      <Icon />
    </template>
    <div @mousedown.stop @mousemove.stop @dragstart.stop>
      <div class="pb pb-clipboard pb-control">
        <div v-if="!pastedItems.length" class="pb-clipboard-info">
          <h4>Keine Elemente in der Zwischenablage</h4>
          <p>
            Verwenden Sie Ctrl-V auf der Seite um Inhalte einzufügen. Diese
            werden dann hier angezeigt.
          </p>
        </div>
        <ClipboardList
          v-if="pastedItems.length"
          :items="pastedItems"
          @remove="remove"
        />
      </div>
    </div>
  </PluginSidebar>
</template>

<script lang="ts" setup>
import PluginSidebar from './../../Plugin/Sidebar/index.vue'
import Icon from './../../Icons/Clipboard.vue'
import ClipboardList from './List/index.vue'
import type { ClipboardItem } from './List/index.vue'

import { KeyPressedEvent } from '../../types'

const { showSidebar, eventBus, selectedParagraph } = useParagraphsBuilderStore()

const ALLOWED_HTML_ATTRIBUTES = ['href']

const pastedItems = ref<ClipboardItem[]>([])

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

const TYPES_IMAGE = ['image/jpeg', 'image/png', 'image/jpg']

function handleFiles(data: DataTransfer) {
  if (!FileReader) {
    return
  }

  const files = [...data.files]

  files.forEach((file) => {
    const fr = new FileReader()
    fr.onload = function () {
      if (typeof fr.result === 'string') {
        if (TYPES_IMAGE.includes(file.type)) {
          pastedItems.value.push({
            type: 'image',
            paragraphType: 'image',
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

function showClipboardSidebar() {
  showSidebar('clipboard')
}

function onPaste(e: ClipboardEvent) {
  // Stop data actually being pasted into div
  e.stopPropagation()
  e.preventDefault()

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

  const youtubeId = getYouTubeID(pastedData)

  if (youtubeId) {
    pastedItems.value.push({
      type: 'youtube',
      paragraphType: 'video_remote',
      data: youtubeId,
    })
    showClipboardSidebar()
    return
  }

  const div = document.createElement('div')
  div.innerHTML = pastedData.replace(/(?:&nbsp;|<br>)/g, '')

  removeAttributes(div)
  if (div.innerText) {
    showClipboardSidebar()
    pastedItems.value.push({
      type: 'text',
      paragraphType: 'text',
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
  } catch (_e) {}
}

function copySelectedParagraphToClipboard(uuid: string) {
  const element = document.querySelector(`[data-uuid="${uuid}"]`)
  if (element instanceof HTMLElement) {
    const markup = element.outerHTML
    setClipboard(markup)
  }
}

function onKeyPressed(e: KeyPressedEvent) {
  if (!selectedParagraph.value) {
    return
  }
  if (e.code !== 'c' || !e.meta) {
    return
  }
  copySelectedParagraphToClipboard(selectedParagraph.value.uuid)
}

onMounted(() => {
  eventBus.on('keyPressed', onKeyPressed)
  document.addEventListener('paste', onPaste)
  document.body.addEventListener('drop', onDrop)
  document.addEventListener('dragover', onDragOver)
})
onUnmounted(() => {
  eventBus.off('keyPressed', onKeyPressed)
  document.removeEventListener('paste', onPaste)
  document.body.removeEventListener('drop', onDrop)
  document.removeEventListener('dragover', onDragOver)
})
</script>
