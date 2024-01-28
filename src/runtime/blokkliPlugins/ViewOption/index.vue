<template>
  <Teleport to="#bk-toolbar-view-options">
    <button
      v-if="!ui.isMobile.value"
      class="bk-toolbar-button"
      :class="{ 'bk-is-inactive': !isActive }"
      @click.prevent.stop="onClick"
    >
      <slot name="icon">
        <Icon v-if="icon" :name="icon" />
      </slot>
      <div class="bk-tooltip">
        <span>{{ title }}</span>

        <ShortcutIndicator
          v-if="keyCode"
          meta
          :key-code="keyCode"
          :label="label"
          group="ui"
          @pressed="onClick"
        />
      </div>
    </button>
  </Teleport>

  <slot :is-active="isActive && !ui.isMobile.value" />
</template>

<script setup lang="ts">
import { useBlokkli, onMounted, onBeforeUnmount, computed } from '#imports'
import { ShortcutIndicator, Icon } from '#blokkli/components'
import type { BlokkliIcon } from '#blokkli/icons'
import type { Command } from '#blokkli/types'

const { storage, ui, commands } = useBlokkli()

const props = defineProps<{
  id: string
  label: string
  titleOn: string
  titleOff: string
  editOnly?: boolean
  keyCode?: string
  icon?: BlokkliIcon
}>()

const storageKey = 'view_option_' + props.id

const isActive = storage.use(storageKey, false)

const title = computed(() => (isActive.value ? props.titleOff : props.titleOn))

const onClick = () => {
  isActive.value = !isActive.value
}

const commandProvider = (): Command => {
  return {
    id: 'plugin:view_option:' + props.id,
    label: title.value,
    icon: props.icon,
    group: 'ui',
    callback: () => (isActive.value = !isActive.value),
  }
}

onMounted(() => {
  commands.add(commandProvider)
})

onBeforeUnmount(() => {
  commands.remove(commandProvider)
})
</script>

<script lang="ts">
export default {
  name: 'PluginViewOption',
}
</script>
