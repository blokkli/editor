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
        <span>{{ isActive ? titleOff : titleOn }}</span>

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
import { useBlokkli } from '#imports'
import { ShortcutIndicator, Icon } from '#blokkli/components'
import type { BlokkliIcon } from '#blokkli/icons'

const { storage, ui } = useBlokkli()

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

const onClick = () => {
  isActive.value = !isActive.value
}
</script>

<script lang="ts">
export default {
  name: 'PluginViewOption',
}
</script>
