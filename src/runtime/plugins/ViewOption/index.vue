<template>
  <Teleport to="#bk-toolbar-view-options">
    <button
      class="bk-toolbar-button"
      :class="{ 'bk-is-inactive': !isActive }"
      @click="onClick"
    >
      <slot name="icon" />
      <div class="bk-tooltip">
        <span>{{ isActive ? titleOff : titleOn }}</span>

        <ShortcutIndicator
          v-if="keyCode"
          meta
          :key-code="keyCode"
          @pressed="onClick"
        />
      </div>
    </button>
  </Teleport>

  <slot :is-active="isActive" />
</template>

<script setup lang="ts">
import { useBlokkli } from '#imports'
import { ShortcutIndicator } from '#blokkli/components'

const { storage } = useBlokkli()

const props = defineProps<{
  id: string
  titleOn: string
  titleOff: string
  editOnly?: boolean
  keyCode?: string
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
