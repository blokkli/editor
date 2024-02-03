<template>
  <Teleport :to="to">
    <button
      class="bk-menu-list-button"
      :disabled="disabled"
      :class="type ? 'bk-is-' + type : ''"
      :style="{ order: weight || 0 }"
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
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import type { BlokkliIcon } from '#blokkli/icons'
import { Icon } from '#blokkli/components'
import defineCommands from '#blokkli/helpers/composables/defineCommands'

const props = defineProps<{
  id: string
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
  () => `#bk-menu-${props.secondary ? 'secondary' : 'primary'}`,
)

function onClick() {
  ui.menu.close()
  emit('click')
}

const commandCallback = () => {
  if (!props.disabled) {
    emit('click')
  }
}

defineCommands(() => {
  return {
    id: 'plugin:menu_button:' + props.id,
    group: 'action',
    label: props.title,
    icon: props.icon,
    disabled: props.disabled,
    callback: commandCallback,
  }
})
</script>

<script lang="ts">
export default {
  name: 'PluginMenuButton',
}
</script>
