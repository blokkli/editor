<template>
  <div
    class="pb pb-available-paragraphs pb-control"
    :class="{ 'pb-is-disabled': !canUse, 'pb-is-active': canUse && isActive }"
    ref="wrapper"
    @wheel.prevent.capture="onWheel"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div ref="typeList" class="pb-list" :style="style">
      <div
        class="pb-list-item pb-clone"
        data-element-type="new"
        :data-paragraph-type="type.id"
        v-for="(type, i) in sortedList"
        :class="{ 'pb-is-disabled': !type.id || !selectable.includes(type.id) }"
        :key="i + type.id + updateKey"
      >
        <div class="pb-list-item-inner">
          <div class="pb-list-item-icon">
            <ParagraphIcon :bundle="type.id" />
          </div>
          <div class="pb-list-item-label">
            <span>{{ type.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Sortable from 'sortablejs'
import { falsy, onlyUnique } from './../helpers'
import ParagraphIcon from './../ParagraphIcon/index.vue'
import { PbType } from '../../../types'
import { eventBus } from './../eventBus'

const STORAGE_KEY = '_vp_paragraphs_sorting'

const props = defineProps<{
  canUse: boolean
  paragraphTypes: PbType[] | null
  selectable: string[]
}>()

const typeList = ref<HTMLDivElement | null>(null)
const wrapper = ref<HTMLDivElement | null>(null)
const isDragging = ref(false)
const isActive = ref(false)
const updateKey = ref(0)
const sorts = ref<string[]>([])
const scrollY = ref(0)

let instance: Sortable | null = null
let mouseTimeout: any = null

function onWheel(e: WheelEvent) {
  const scrollHeight = typeList.value?.scrollHeight || 0
  const wrapperHeight = wrapper.value?.offsetHeight || 0
  const diff = Math.min(Math.max(e.deltaY, -20), 20)
  scrollY.value = Math.min(
    Math.max(scrollY.value + diff, 0),
    scrollHeight - wrapperHeight,
  )
}

function onMouseEnter() {
  clearTimeout(mouseTimeout)
  mouseTimeout = setTimeout(() => {
    isActive.value = true
  }, 200)
}
function onMouseLeave() {
  clearTimeout(mouseTimeout)
  isActive.value = false
}

const style = computed(() => {
  return {
    transform: `translateY(-${scrollY.value}px)`,
  }
})

function storeSort() {
  if (typeList.value) {
    const sorted = [...typeList.value.querySelectorAll('.pb-list-item')]
      .map((v) => {
        return (v as HTMLDivElement).dataset.paragraphType
      })
      .filter(falsy)
      .filter(onlyUnique)
    sorts.value = sorted
    localStorage.setItem(STORAGE_KEY, sorted.join(','))
  }
}

const sortedList = computed(() => {
  if (!props.paragraphTypes) {
    return []
  }
  return [...props.paragraphTypes]
    .filter((v) => v.id !== 'from_library')
    .sort((a, b) => {
      if (a.id && b.id) {
        return sorts.value.indexOf(a.id) - sorts.value.indexOf(b.id)
      }
      return 9999
    })
})

onMounted(() => {
  sorts.value = (localStorage.getItem(STORAGE_KEY) || '').split(',') || []
  if (typeList.value) {
    instance = new Sortable(typeList.value, {
      sort: true,
      group: {
        name: 'types',
        put: false,
        pull: 'clone',
        revertClone: false,
      },
      fallbackClass: 'sortable-fallback',
      onStart(e) {
        const rect = e.item.getBoundingClientRect()
        const originalEvent = (e as any).originalEvent || ({} as PointerEvent)
        eventBus.emit('draggingStart', {
          rect,
          offsetX: originalEvent.clientX,
          offsetY: originalEvent.clientY,
        })
        isDragging.value = true
      },
      onEnd() {
        eventBus.emit('draggingEnd')
        isDragging.value = false
        storeSort()
        updateKey.value = updateKey.value + 1
        if (typeList.value) {
          typeList.value
            .querySelectorAll('[draggable="false"]')
            .forEach((el) => el.remove())
        }
      },
      forceFallback: true,
      animation: 300,
    })
  }
})
onUnmounted(() => {
  if (instance) {
    instance.destroy()
  }
})
</script>

<style lang="postcss"></style>
