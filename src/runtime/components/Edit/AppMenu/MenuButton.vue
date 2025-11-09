<template>
  <button
    :id="'bk-menu-list-button-' + id"
    class="bk-menu-list-button"
    :disabled="disabled"
    :class="type ? 'bk-is-' + type : ''"
    @click.prevent.stop="onClick"
  >
    <div class="bk-menu-list-icon">
      <slot>
        <Icon v-if="icon" :name="icon" />
      </slot>
    </div>
    <strong>{{ title }}</strong>
    <span>{{ description }}</span>
  </button>
</template>

<script lang="ts" setup>
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon } from '#blokkli/components'

defineProps<{
  id: string
  title: string
  description: string
  disabled?: boolean
  icon?: BlokkliIcon
  type?: 'success' | 'danger' | 'yellow'
}>()

const emit = defineEmits(['click'])

function onClick() {
  emit('click')
}
</script>

<script lang="ts">
export default {
  name: 'MenuButton',
}
</script>
