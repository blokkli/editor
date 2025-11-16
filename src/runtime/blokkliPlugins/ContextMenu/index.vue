<template>
  <Component :is="tag" @contextmenu.stop.prevent="onContextMenu">
    <slot />
    <Teleport :to="ui.mainLayoutElement.value">
      <BlokkliTransition name="context-menu">
        <ContextMenuMenu
          v-if="isVisible"
          :menu="menu"
          :x="x"
          :y="y"
          @close="ui.openContextMenu.value = ''"
        />
      </BlokkliTransition>
    </Teleport>
  </Component>
</template>

<script lang="ts" setup>
import type { ContextMenu } from '#blokkli/types'
import { ref, computed, useBlokkli } from '#imports'
import ContextMenuMenu from './Menu/index.vue'
import { BlokkliTransition } from '#blokkli/components'

const props = withDefaults(
  defineProps<{
    /**
     * Unique identifier for this context menu.
     *
     * Used to track which menu is currently open.
     */
    id: string

    /**
     * Array of menu items to display.
     *
     * Each item can have nested sub-menus.
     */
    menu: ContextMenu[]

    /**
     * The HTML tag to use for the wrapper element.
     *
     * @default 'div'
     */
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
  x.value = e.clientX
  y.value = e.clientY
  ui.openContextMenu.value = props.id
}
</script>
