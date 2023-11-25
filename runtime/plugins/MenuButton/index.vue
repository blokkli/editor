<template>
  <Teleport :to="to">
    <button
      class="pb-toolbar-menu-list-button"
      :disabled="disabled"
      @click="onClick"
      :class="type ? 'pb-is-' + type : ''"
      :style="{ order: weight || 0 }"
    >
      <div class="pb-toolbar-menu-list-icon">
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
import type { PbIcon } from '#pb/icons'
import { Icon } from '#pb/components'

const props = defineProps<{
  title: string
  description: string
  disabled?: boolean
  icon?: PbIcon
  type?: 'success' | 'danger'
  weight?: number
  secondary?: boolean
}>()

const emit = defineEmits(['click'])

const { eventBus } = useParagraphsBuilderStore()

const to = computed(
  () => `#pb-toolbar-menu-${props.secondary ? 'secondary' : 'primary'}`,
)

function onClick() {
  eventBus.emit('closeMenu')
  emit('click')
}
</script>
