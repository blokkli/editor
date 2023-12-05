<template>
  <Teleport to="#pb-toolbar-view-options">
    <button
      class="pb-toolbar-button"
      @click="onClick"
      :class="{ 'pb-is-inactive': !isActive }"
    >
      <slot name="icon"></slot>
      <div class="pb-tooltip">
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

  <slot :is-active="isActive"></slot>
</template>

<script setup lang="ts">
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
