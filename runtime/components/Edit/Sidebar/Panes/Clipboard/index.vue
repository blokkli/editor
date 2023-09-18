<template>
  <SidebarInner title="Zwischenablage">
    <div class="pb pb-clipboard pb-control">
      <div v-if="!pastedItems.length" class="pb-clipboard-info">
        <h4>Keine Elemente in der Zwischenablage</h4>
        <p>
          Verwenden Sie Ctrl-V auf der Seite um Inhalte einzufügen. Diese werden
          dann hier angezeigt.
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
                :class="contentClass"
                v-html="item.data"
              />
              <div v-else-if="item.type === 'youtube'">
                <img
                  :src="`http://i3.ytimg.com/vi/${item.data}/hqdefault.jpg`"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </SidebarInner>
</template>

<script lang="ts" setup>
import Sortable from 'sortablejs'
import SidebarInner from './../../Inner/index.vue'
import ParagraphIcon from './../../../ParagraphIcon/index.vue'
import IconDelete from './../../../Icons/Delete.vue'
import { PbType } from './../../../../../types'

interface ClipboardItemText {
  type: 'text'
  paragraphType: string
  data: string
}

interface ClipboardItemYouTube {
  type: 'youtube'
  paragraphType: string
  data: string
}

type ClipboardItem = ClipboardItemText | ClipboardItemYouTube

const emit = defineEmits(['paste'])

const ALLOWED_HTML_ATTRIBUTES = ['href']

const listEl = ref<HTMLDivElement | null>(null)
const pastedItems = ref<ClipboardItem[]>([])
const renderKey = ref(0)

const props = defineProps<{
  contentClass?: string
  allTypes: PbType[]
}>()

function getLabel(bundle: string): string {
  return props.allTypes.find((v) => v.id === bundle)?.label || bundle
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

let instance: Sortable | null = null

function onPaste(e: ClipboardEvent) {
  // Stop data actually being pasted into div
  e.stopPropagation()
  e.preventDefault()

  // Get pasted data via clipboard API
  const clipboardData = e.clipboardData
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
    emit('paste')
    return
  }

  const div = document.createElement('div')
  div.innerHTML = pastedData.replace(/(?:&nbsp;|<br>)/g, '')

  removeAttributes(div)
  if (div.innerText) {
    emit('paste')
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
    })
  }
})
onUnmounted(() => {
  document.removeEventListener('paste', onPaste)
  if (instance) {
    instance.destroy()
  }
})
</script>

<style lang="postcss"></style>
