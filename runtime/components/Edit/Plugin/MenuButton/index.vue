<template>
  <Teleport to="#pb-toolbar-menu">
    <button
      class="pb-toolbar-menu-list-button"
      :disabled="disabled"
      @click="onClick"
      :class="type ? 'pb-is-' + type : ''"
    >
      <div class="pb-toolbar-menu-list-icon">
        <slot></slot>
      </div>
      <strong>{{ title }}</strong>
      <span>{{ description }}</span>
    </button>
  </Teleport>
</template>

<script lang="ts" setup>
defineProps<{
  title: string
  description: string
  disabled?: boolean
  type?: 'success' | 'danger'
}>()

const emit = defineEmits(['click'])

const { eventBus } = useParagraphsBuilderStore()

function onClick() {
  eventBus.emit('closeMenu')
  emit('click')
}
</script>
