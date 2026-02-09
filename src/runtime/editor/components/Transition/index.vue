<template>
  <Transition :name :duration appear>
    <slot />
  </Transition>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'

type TransitionName =
  | 'transform-overlay'
  | 'fade'
  | 'touch-bar'
  | 'drag-item'
  | 'editable'
  | 'menu'
  | 'loading'
  | 'drop-up'
  | 'toolbar'
  | 'slide-in'
  | 'slide-up'
  | 'search'
  | 'context-menu'
  | 'command-palette'
  | 'caret-tooltip'

const props = withDefaults(
  defineProps<{
    name: TransitionName
    enabled?: boolean
  }>(),
  {
    enabled: true,
  },
)

const { ui } = useBlokkli()

const DURATION: Partial<Record<TransitionName, number>> = {
  'transform-overlay': 300,
  fade: 200,
  menu: 200,
  toolbar: 200,
  'context-menu': 200,
  'drag-item': 200,
  'slide-in': 300,
  'slide-up': 300,
  search: 300,
  editable: 250,
  'touch-bar': 200,
  'command-palette': 100,
  'caret-tooltip': 150,
  'drop-up': 200,
}

const name = computed(() => {
  if (!ui.useAnimations.value || !props.enabled) {
    return
  }
  return 'bk-' + props.name
})

const duration = computed(() => {
  if (!ui.useAnimations.value || !props.enabled) {
    return
  }
  return DURATION[props.name]
})
</script>
