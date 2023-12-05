<template>
  <Teleport to="#pb-sidebar-tabs">
    <button
      @click="toggleSidebar(id)"
      :class="{ 'is-active': activeSidebar === id }"
      :disabled="editOnly && !state.canEdit.value"
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

const props = defineProps<{
  id: string
  title: string
  editOnly?: boolean
  icon?: PbIcon
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
    document.documentElement.classList.add('pb-has-sidebar-right')
  } else {
    document.documentElement.classList.remove('pb-has-sidebar-right')
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
