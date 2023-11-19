<template>
  <PluginSidebar id="clipboard" title="Zwischenablage" edit-only>
    <template #icon>
      <Icon />
    </template>
    <div>
      <div class="pb pb-clipboard pb-control">
        <div v-if="!pastedItems.length" class="pb-clipboard-info">
          <h4>Keine Elemente in der Zwischenablage</h4>
          <p>
            Verwenden Sie Ctrl-V auf der Seite um Inhalte einzufügen. Diese
            werden dann hier angezeigt.
          </p>
        </div>
        <div ref="listEl" class="pb-clipboard-list">
          <div
            v-for="(item, index) in pastedItems"
            class="pb-clone"
            data-element-type="clipboard"
            :data-paragraph-type="item.paragraphType"
            :data-clipboard-type="item.type"
            :data-clipboard-data="item.data"
            :data-clipboard-additional="item.additional"
            :key="item.data + renderKey"
          >
            <div class="pb-clipboard-item">
              <div class="pb-clipboard-item-header">
                <ParagraphIcon :bundle="item.paragraphType" />
                <div>{{ getLabel(item.paragraphType) }}</div>
                <button @click="remove(index)"><IconDelete /></button>
              </div>
              <div>
                <div
                  v-if="item.type === 'text'"
                  class="pb-clipboard-item-inner"
                  v-html="item.data"
                />
                <div v-else-if="item.type === 'youtube'">
                  <img
                    :src="`http://i3.ytimg.com/vi/${item.data}/hqdefault.jpg`"
                  />
                </div>
                <div v-else-if="item.type === 'image'">
                  <img :src="item.data" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PluginSidebar>
</template>

<script lang="ts" setup>
import PluginSidebar from './../../Plugin/Sidebar/index.vue'
import ParagraphIcon from './../../ParagraphIcon/index.vue'
import Icon from './../../Icons/Clipboard.vue'
import IconDelete from './../../Icons/Delete.vue'

import Sortable from 'sortablejs'
import { eventBus } from './../../eventBus'

const { allTypes, showSidebar } = useParagraphsBuilderStore()

interface ClipboardItemText {
  type: 'text'
  paragraphType: string
  data: string
  additional?: string
}

interface ClipboardItemYouTube {
  type: 'youtube'
  paragraphType: string
  data: string
  additional?: string
}

interface ClipboardItemImage {
  type: 'image'
  paragraphType: string
  data: string
  additional: string
}

type ClipboardItem =
  | ClipboardItemText
  | ClipboardItemYouTube
  | ClipboardItemImage

const ALLOWED_HTML_ATTRIBUTES = ['href']

const listEl = ref<HTMLDivElement | null>(null)
const pastedItems = ref<ClipboardItem[]>([])
const renderKey = ref(0)

function getLabel(bundle: string): string {
  return allTypes.value.find((v) => v.id === bundle)?.label || bundle
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

let instance: Sortable | null = null

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

onMounted(() => {
  document.addEventListener('paste', onPaste)
  document.body.addEventListener('drop', onDrop)
  document.addEventListener('dragover', onDragOver)
  if (listEl.value) {
    instance = new Sortable(listEl.value, {
      sort: false,
      group: {
        name: 'types',
        put: false,
        revertClone: false,
      },
      onRemove(e) {
        const oldIndex = e.oldIndex
        if (oldIndex !== undefined) {
          remove(oldIndex)
        }
        renderKey.value += 1
      },
      forceFallback: true,
      animation: 300,
      onStart(e) {
        const rect = e.item.getBoundingClientRect()
        const originalEvent = (e as any).originalEvent || ({} as PointerEvent)
        eventBus.emit('draggingStart', {
          rect,
          offsetX: originalEvent.clientX,
          offsetY: originalEvent.clientY,
        })
      },
      onEnd() {
        eventBus.emit('draggingEnd')
      },
    })
  }
})
onUnmounted(() => {
  document.removeEventListener('paste', onPaste)
  document.body.removeEventListener('drop', onDrop)
  document.removeEventListener('dragover', onDragOver)
  if (instance) {
    instance.destroy()
  }
})
</script>
