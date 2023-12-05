<template>
  <Teleport :to="'#bk-toolbar-' + region">
    <button
      class="bk-toolbar-button"
      @click="onClick"
      :disabled="disabled"
      :class="{ 'is-active': active }"
    >
      <slot>
        <Icon v-if="icon" :name="icon" />
      </slot>
      <div class="bk-tooltip">
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
import { ShortcutIndicator } from '#blokkli/components'
import type { BlokkliIcon } from '#blokkli/icons'
import { Icon } from '#blokkli/components'

const props = defineProps<{
  title: string
  region:
    | 'after-title'
    | 'before-title'
    | 'before-sidebar'
    | 'after-menu'
    | 'before-view-options'
  editOnly?: boolean
  disabled?: boolean
  active?: boolean
  meta?: boolean
  shift?: boolean
  keyCode?: string
  icon?: BlokkliIcon
}>()

const emit = defineEmits(['click'])

function onClick() {
  if (props.disabled) {
    return
  }

  emit('click')
}
</script>
