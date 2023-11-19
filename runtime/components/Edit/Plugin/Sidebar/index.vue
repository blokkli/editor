<template>
  <Teleport to="#pb-sidebar-tabs">
    <button
      @click="toggleSidebar(id)"
      :class="{ 'is-active': activeSidebar === id }"
      :disabled="editOnly && !canEdit"
    >
      <slot name="icon"></slot>
      <div class="pb-tooltip">{{ title }}</div>
    </button>
  </Teleport>

  <Teleport to="#pb-sidebar-content" v-if="activeSidebar === id">
    <div class="pb-sidebar-inner" @wheel.stop="">
      <h3 class="pb-sidebar-title">{{ title }}</h3>
      <div class="pb-sidebar-content">
        <slot></slot>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  id: string
  title: string
  editOnly?: boolean
}>()

const { toggleSidebar, activeSidebar, canEdit } = useParagraphsBuilderStore()
</script>
