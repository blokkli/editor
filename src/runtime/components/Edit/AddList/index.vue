<template>
  <Teleport
    v-if="state.canEdit.value && state.editMode.value === 'editing'"
    to="body"
  >
    <div
      ref="wrapper"
      class="bk bk-add-list bk-control"
      :class="[{ 'bk-is-active': isActive }, 'bk-is-' + listOrientation]"
      @wheel.capture="onWheel"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <Sortli ref="typeList" class="bk-list">
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
let mouseTimeout: any = null

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

const onWheel = (e: WheelEvent) => {}

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
