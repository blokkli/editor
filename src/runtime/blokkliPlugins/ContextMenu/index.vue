<template>
  <Component :is="tag" @contextmenu.stop.prevent="onContextMenu">
    <slot></slot>
    <Teleport to="body">
      <Transition name="bk-context-menu">
        <ContextMenuMenu
          v-if="isVisible"
          :menu="menu"
          :x="x"
          :y="y"
          @close="ui.openContextMenu.value = ''"
        />
      </Transition>
    </Teleport>
  </Component>
</template>

<script lang="ts" setup>
import type { ContextMenu } from '#blokkli/types'
import { ref, computed, useBlokkli } from '#imports'
import ContextMenuMenu from './Menu/index.vue'

const props = withDefaults(
  defineProps<{
    id: string
    menu: ContextMenu[]
    tag?: string
  }>(),
  {
    tag: 'div',
  },
)

const { ui } = useBlokkli()

const isVisible = computed(() => ui.openContextMenu.value === props.id)

const x = ref(0)
const y = ref(0)

const onContextMenu = (e: MouseEvent) => {
  if (!props.id || typeof props.id !== 'string' || !props.menu.length) {
    return
  }
  x.value = e.x
  y.value = e.y
  ui.openContextMenu.value = props.id
}
</script>
