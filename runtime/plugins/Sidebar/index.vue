<template>
  <Teleport to="#pb-sidebar-tabs">
    <button
      @click="toggleSidebar(id)"
      :class="{ 'is-active': activeSidebar === id }"
      :disabled="editOnly && !canEdit"
    >
      <slot name="icon">
        <Icon v-if="icon" :name="icon" />
      </slot>
      <div class="pb-tooltip">{{ title }}</div>
    </button>
  </Teleport>

  <Teleport to="#pb-sidebar-content" v-if="activeSidebar === id">
    <div class="pb-sidebar-inner" @wheel.stop="">
      <h3 class="pb-sidebar-title">{{ title }}</h3>
      <div ref="sidebarContent" class="pb-sidebar-content">
        <slot :scrolled-to-end="scrolledToEnd"></slot>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { PbIcon } from '#pb/icons'
import { Icon } from '#pb/components'

defineProps<{
  id: string
  title: string
  editOnly?: boolean
  icon?: PbIcon
}>()

const { toggleSidebar, activeSidebar, canEdit } = useParagraphsBuilderStore()

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
</script>
