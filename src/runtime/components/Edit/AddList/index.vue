<template>
  <Teleport
    v-if="state.canEdit.value && state.editMode.value === 'editing'"
    to="body"
  >
    <div
      ref="wrapper"
      class="bk bk-add-list bk-control"
      :class="[{ 'bk-is-active': isActive }, 'bk-is-' + listOrientation]"
      @wheel.capture.stop="onWheel"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <Sortli ref="typeList" class="bk-list" :style="style">
        <div id="blokkli-add-list-actions"></div>
        <div id="blokkli-add-list-blocks"></div>
      </Sortli>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  watch,
  ref,
  computed,
  useBlokkli,
  onMounted,
  onUnmounted,
} from '#imports'

import { Sortli } from '#blokkli/components'

const { state, storage, ui } = useBlokkli()

type ListOrientation = 'horizontal' | 'vertical'

const listOrientationSetting = storage.use<ListOrientation>(
  'listOrientation',
  'vertical',
)

const listOrientation = computed<ListOrientation>(() =>
  ui.isMobile.value ? 'horizontal' : listOrientationSetting.value,
)

watch(listOrientation, setRootClasses)

const typeList = ref<HTMLDivElement | null>(null)
const wrapper = ref<HTMLDivElement | null>(null)
const isActive = ref(false)
const scrollX = ref(0)
const scrollY = ref(0)

let mouseTimeout: any = null

function onWheel(e: WheelEvent) {
  return
  if (ui.isMobile.value) {
    return
  }
  e.preventDefault()
  return
  if (listOrientation.value === 'vertical') {
    const scrollHeight = typeList.value?.scrollHeight || 0
    const wrapperHeight = wrapper.value?.offsetHeight || 0
    const diff = Math.min(Math.max(e.deltaY, -20), 20)
    if (wrapperHeight > scrollHeight) {
      scrollY.value = 0
    } else {
      scrollY.value = Math.min(
        Math.max(scrollY.value + diff, 0),
        scrollHeight - wrapperHeight,
      )
    }
  } else if (listOrientation.value === 'horizontal') {
    const scrollWidth = typeList.value?.scrollWidth || 0
    const wrapperWidth = wrapper.value?.offsetWidth || 0
    const diff = Math.min(Math.max(e.deltaY || e.deltaX, -20), 20)
    if (wrapperWidth > scrollWidth) {
      scrollX.value = 0
    } else {
      scrollX.value = Math.min(
        Math.max(scrollX.value + diff, 0),
        scrollWidth - wrapperWidth,
      )
    }
  }
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
    transform:
      listOrientation.value === 'vertical'
        ? `translateY(-${scrollY.value}px)`
        : `translateX(-${scrollX.value}px)`,
  }
})

function setRootClasses() {
  document.documentElement.classList.remove('bk-has-sidebar-bottom')
  document.documentElement.classList.remove('bk-has-sidebar-left')

  if (listOrientation.value === 'horizontal') {
    document.documentElement.classList.add('bk-has-sidebar-bottom')
  } else if (listOrientation.value === 'vertical') {
    document.documentElement.classList.add('bk-has-sidebar-left')
  }
}

onMounted(() => {
  setRootClasses()
})
onUnmounted(() => {
  document.documentElement.classList.remove('bk-has-sidebar-bottom')
  document.documentElement.classList.remove('bk-has-sidebar-left')
})
</script>

<script lang="ts">
export default {
  name: 'AddList',
}
</script>
