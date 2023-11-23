<template>
  <Teleport :to="'#pb-toolbar-' + region">
    <button
      class="pb-toolbar-button"
      @click="onClick"
      :disabled="disabled"
      :class="{ 'is-active': active }"
    >
      <slot></slot>
      <div class="pb-tooltip">
        <span>{{ title }}</span>
        <ShortcutIndicator
          v-if="keyCode"
          :meta="meta"
          :shift="shift"
          :key-code="keyCode"
          @pressed="onClick"
        />
      </div>
    </button>
  </Teleport>
</template>

<script setup lang="ts">
import ShortcutIndicator from './../../ShortcutIndicator/index.vue'

const props = defineProps<{
  title: string
  region: 'after-title' | 'before-title' | 'before-sidebar' | 'after-menu'
  editOnly?: boolean
  disabled?: boolean
  active?: boolean
  meta?: boolean
  shift?: boolean
  keyCode?: string
}>()

const emit = defineEmits(['click'])

function onClick() {
  if (props.disabled) {
    return
  }

  emit('click')
}
</script>
