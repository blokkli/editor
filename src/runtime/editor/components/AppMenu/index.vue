<template>
  <BlokkliTransition name="menu">
    <div
      v-if="menuOpen"
      class="bk bk-menu-list"
      @wheel.passive.stop
      @touchstart.stop.passive
      @touchmove.stop.passive
    >
      <button :class="{ 'bk-is-active': menuOpen }" @click="closeMenu">
        <Icon name="bk_mdi_close" />
      </button>
      <div class="bk-menu-list-inner">
        <div id="bk-menu-primary">
          <MenuButton
            v-for="button in primaryButtons"
            :id="button.id"
            :key="button.id"
            :title="button.title"
            :description="button.description"
            :icon="button.icon"
            :type="button.type"
            :disabled="button.disabled"
            @click="onClick(button)"
          />
        </div>
        <div id="bk-menu-secondary">
          <MenuButton
            v-for="button in secondaryButtons"
            :id="button.id"
            :key="button.id"
            :title="button.title"
            :description="button.description"
            :icon="button.icon"
            :type="button.type"
            :disabled="button.disabled"
            @click="onClick(button)"
          />
        </div>
        <aside class="bk-menu-meta">
          <div class="bk-menu-meta-logo">
            <Icon name="logo" />
            <div><strong>@blokkli/editor</strong> {{ blokkliVersion }}</div>
          </div>

          <div>
            <a href="https://www.blokk.li" target="_blank">blokk.li</a>
          </div>
        </aside>
      </div>
    </div>
  </BlokkliTransition>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { Icon, BlokkliTransition } from '#blokkli/editor/components'
import { blokkliVersion } from '#blokkli-build/editor-config'
import MenuButton from './MenuButton.vue'
import type { MenuButtonPlugin } from '#blokkli/editor/providers/plugin'
import { onBlokkliEvent } from '#blokkli/editor/composables'

const DIALOG_MENU = 'menu'

const { ui, plugins } = useBlokkli()

const menuOpen = computed(() => ui.currentDialog.value?.id === DIALOG_MENU)

function closeMenu() {
  ui.closeDialog(DIALOG_MENU)
}

onBlokkliEvent('overlay:close', closeMenu)

const allButtons = computed(() => plugins.get('menuButton'))

const primaryButtons = computed(() => {
  return allButtons.value
    .filter((button) => !button.secondary)
    .sort((a, b) => (a.weight || 0) - (b.weight || 0))
})

const secondaryButtons = computed(() => {
  return allButtons.value
    .filter((button) => button.secondary)
    .sort((a, b) => (a.weight || 0) - (b.weight || 0))
})

function onClick(button: MenuButtonPlugin) {
  button.callback()
  closeMenu()
}
</script>

<script lang="ts">
export default {
  name: 'AppMenu',
}
</script>
