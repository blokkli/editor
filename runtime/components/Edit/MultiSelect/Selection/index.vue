<template>
  <div class="pb pb-multi-select-selection pb-control" :style="wrapperStyle">
    <div
      v-if="showActions"
      class="pb-paragraph-actions pb-control"
      @mouseup.capture.prevent=""
    >
      <div class="pb-paragraph-actions-inner">
        <div class="pb-paragraph-actions-type">
          <div class="pb-paragraph-actions-type-button">
            <span>{{ items.length }} Paragraphs</span>
          </div>
        </div>
        <div class="pb-paragraph-actions-buttons">
          <button @click.prevent.capture="$emit('duplicate')" disabled>
            <IconDuplicate />
            <div class="pb-tooltip">Duplizieren</div>
          </button>
          <button @click.prevent.capture="$emit('delete')">
            <IconDelete />
            <div class="pb-tooltip">Löschen</div>
          </button>
        </div>
      </div>
    </div>
    <div ref="container">
      <div
        class="pb-multi-select-selection-item pb-clone"
        :style="style"
        data-element-type="multiple_existing"
        :data-bundles="bundles"
        :data-uuids="uuids"
      >
        <div v-for="item in selected" :style="item.style"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Sortable from 'sortablejs'
import type { Rectangle } from '../Item/index.vue'
import IconDelete from './../../Icons/Delete.vue'
import IconDuplicate from './../../Icons/Duplicate.vue'
import { DraggableExistingParagraphItem } from '../../types'

function getCoords(elem: HTMLElement): Rectangle {
  const box = elem.getBoundingClientRect()

  const body = document.body
  const docEl = document.documentElement

  const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop
  const scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft

  const clientTop = docEl.clientTop || body.clientTop || 0
  const clientLeft = docEl.clientLeft || body.clientLeft || 0

  const top = box.top + scrollTop - clientTop
  const left = box.left + scrollLeft - clientLeft

  return {
    x: Math.round(left),
    y: Math.round(top),
    width: box.width,
    height: box.height,
  }
}

defineEmits<{
  (e: 'duplicate'): void
  (e: 'delete'): void
}>()

function onlyUnique(value: string, index: number, self: Array<string>) {
  return self.indexOf(value) === index
}

const props = defineProps<{
  items: DraggableExistingParagraphItem[]
  isPressingControl: boolean
}>()

const wrapperEl = ref<HTMLElement | null>(null)

type SelectedItem = {
  style: {
    left: string
    top: string
    width: string
    height: string
  }
  item: DraggableExistingParagraphItem
}

const selected = ref<SelectedItem[]>([])

function getSelected() {
  if (!bounds.value) {
    return []
  }
  return props.items.map((item) => {
    const rect = getCoords(item.element)
    return {
      style: {
        left: rect.x - bounds.value!.x + 'px',
        top: rect.y - bounds.value!.y + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px',
      },
      item,
    }
  })
}

const showActions = ref(true)

let instance: Sortable | null = null
const container = ref<HTMLDivElement | null>(null)

const bounds = ref<Rectangle | undefined>()

function getBounds(): Rectangle | undefined {
  if (props.items.length === 0) {
    return
  }

  const firstRect = getCoords(props.items[0].element)
  let minX = firstRect.x
  let minY = firstRect.y
  let maxX = minX + firstRect.width
  let maxY = minY + firstRect.height

  for (const item of props.items.slice(1)) {
    const rect = getCoords(item.element)
    minX = Math.min(minX, rect.x)
    minY = Math.min(minY, rect.y)
    maxX = Math.max(maxX, rect.x + rect.width)
    maxY = Math.max(maxY, rect.y + rect.height)
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

const bundles = computed(() => {
  return props.items
    .map((v) => v.paragraphType)
    .filter(onlyUnique)
    .join(',')
})

const uuids = computed(() => {
  return props.items.map((v) => v.uuid).join(',')
})

function hideSelectedParagraphs() {
  props.items.map((item) => {
    const el = document.querySelector(`[data-uuid="${item.uuid}"]`)
    el?.classList.add('pb-multi-select-hidden')
  })
}

function showSelectedParagraphs() {
  document.querySelectorAll('.pb-multi-select-hidden').forEach((el) => {
    el?.classList.remove('pb-multi-select-hidden')
  })
}

const style = computed(() => {
  if (!bounds.value) {
    return {}
  }

  return {
    width: bounds.value.width + 'px',
    height: bounds.value.height + 'px',
  }
})

const wrapperStyle = computed(() => {
  if (!bounds.value) {
    return {}
  }

  return {
    transform: `translate(${bounds.value.x}px, ${bounds.value.y}px)`,
    pointerEvents: props.isPressingControl ? 'none' : 'auto',
  }
})

let raf: any = null

function loop() {
  if (!showActions.value) {
    return
  }
  bounds.value = getBounds()
  selected.value = getSelected()
  raf = window.requestAnimationFrame(loop)
}

onMounted(() => {
  if (container.value) {
    instance = new Sortable(container.value, {
      sort: false,
      forceFallback: true,
      swapThreshold: 0,
      group: {
        name: 'types',
        revertClone: false,
      },
      fallbackOnBody: true,
      emptyInsertThreshold: 0,
      animation: 0,
      preventOnFilter: true,
      onStart: (e) => {
        hideSelectedParagraphs()
        showActions.value = false
      },
      onEnd: (e) => {
        if (e.oldIndex === e.newIndex) {
          showActions.value = true
          loop()
          showSelectedParagraphs()
        }
      },
    })
  }
  loop()
})

onUnmounted(() => {
  if (instance) {
    instance.destroy()
  }
  window.cancelAnimationFrame(raf)
})
</script>

<style lang="postcss"></style>
