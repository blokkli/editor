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
          :key-label="keyCode"
          @pressed="onClick"
        />
      </div>
    </button>
  </Teleport>

  <slot :is-active="isActive"></slot>
</template>

<script setup lang="ts">
import ShortcutIndicator from './../../ShortcutIndicator/index.vue'

const props = defineProps<{
  id: string
  titleOn: string
  titleOff: string
  editOnly?: boolean
  keyCode?: string
}>()

const { activeViewOptions, toggleViewOption } = useParagraphsBuilderStore()

const isActive = computed(() => activeViewOptions.value.includes(props.id))

const onClick = () => toggleViewOption(props.id)
</script>
