<template>
  <Teleport to="#bk-sidebar-tabs">
    <button
      :class="{ 'is-active': activeSidebar === id }"
      :disabled="editOnly && !state.canEdit.value"
      :style="{ order: weight || 0 }"
      @click="toggleSidebar(id)"
    >
      <slot name="icon">
        <Icon v-if="icon" :name="icon" />
      </slot>
      <div class="bk-tooltip">
        {{ title }}
      </div>
    </button>
  </Teleport>

  <Teleport v-if="activeSidebar === id" to="#bk-sidebar-content">
    <div class="bk-sidebar-inner" @wheel.stop="">
      <div class="bk">
        <h3 class="bk-sidebar-title">
          {{ title }}
        </h3>
      </div>
      <div ref="sidebarContent" class="bk-sidebar-content">
        <slot :scrolled-to-end="scrolledToEnd" />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, ref, useBlokkli, onMounted, onBeforeUnmount } from '#imports'
import type { BlokkliIcon } from '#blokkli/icons'
import { Icon } from '#blokkli/components'

const props = defineProps<{
  id: string
  title: string
  editOnly?: boolean
  icon?: BlokkliIcon
  weight?: string
}>()

const { storage, state } = useBlokkli()

const activeSidebar = storage.use('sidebar:active', '')

const toggleSidebar = (id: string) =>
  activeSidebar.value === id
    ? (activeSidebar.value = '')
    : (activeSidebar.value = id)

const showSidebar = () => (activeSidebar.value = props.id)

watch(activeSidebar, (active) => {
  if (active) {
    document.documentElement.classList.add('bk-has-sidebar-right')
  } else {
    document.documentElement.classList.remove('bk-has-sidebar-right')
  }
})

const sidebarContent = ref<HTMLDivElement | null>(null)
const scrolledToEnd = ref(false)
let raf: any = null

const loop = () => {
  if (sidebarContent.value) {
    scrolledToEnd.value =
      sidebarContent.value.scrollHeight -
        (sidebarContent.value.scrollTop + sidebarContent.value.offsetHeight) <
      3
  }
  raf = window.requestAnimationFrame(loop)
}

onMounted(() => {
  loop()
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(raf)
})

defineExpose({ showSidebar })
</script>
