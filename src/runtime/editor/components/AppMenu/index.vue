<template>
  <BlokkliTransition name="menu">
    <AppMenuInner v-if="menuOpen" @close="closeMenu" />
  </BlokkliTransition>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, useBlokkli } from '#imports'
import { BlokkliTransition } from '#blokkli/editor/components'
import { onBlokkliEvent } from '#blokkli/editor/composables'

const AppMenuInner = defineAsyncComponent(() => import('./Inner.vue'))

const DIALOG_MENU = 'menu'

const { ui } = useBlokkli()

const menuOpen = computed(() => ui.currentDialog.value?.id === DIALOG_MENU)

function closeMenu() {
  ui.closeDialog(DIALOG_MENU)
}

onBlokkliEvent('overlay:close', closeMenu)
</script>

<script lang="ts">
export default {
  name: 'AppMenu',
}
</script>
