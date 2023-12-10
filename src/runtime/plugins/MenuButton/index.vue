<template>
  <Teleport :to="to">
    <button
      class="bk-toolbar-menu-list-button"
      :disabled="disabled"
      :class="type ? 'bk-is-' + type : ''"
      :style="{ order: weight || 0 }"
      @click="onClick"
    >
      <div class="bk-toolbar-menu-list-icon">
        <slot>
          <Icon v-if="icon" :name="icon" />
        </slot>
      </div>
      <strong>{{ title }}</strong>
      <span>{{ description }}</span>
    </button>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import type { BlokkliIcon } from '#blokkli/icons'
import { Icon } from '#blokkli/components'

const props = defineProps<{
  title: string
  description: string
  disabled?: boolean
  icon?: BlokkliIcon
  type?: 'success' | 'danger'
  weight?: number
  secondary?: boolean
}>()

const emit = defineEmits(['click'])

const { ui } = useBlokkli()

const to = computed(
  () => `#bk-toolbar-menu-${props.secondary ? 'secondary' : 'primary'}`,
)

function onClick() {
  ui.menu.close()
  emit('click')
}
</script>
