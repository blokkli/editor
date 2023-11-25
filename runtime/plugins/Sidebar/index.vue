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
      <div class="pb-sidebar-content">
        <slot></slot>
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
</script>
