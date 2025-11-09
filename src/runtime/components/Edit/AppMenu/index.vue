<template>
  <BlokkliTransition name="menu">
    <div v-show="menuOpen" class="bk bk-menu-list">
      <button :class="{ 'bk-is-active': menuOpen }" @click="closeMenu">
        <Icon name="close" />
      </button>
      <div class="bk-menu-list-inner">
        <div id="bk-menu-primary" />
        <div id="bk-menu-secondary" />
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
import { Icon, BlokkliTransition } from '#blokkli/components'
import { blokkliVersion } from '#blokkli-build/config'

const DIALOG_MENU = 'menu'

const { ui } = useBlokkli()

const menuOpen = computed(() => ui.currentDialog.value === DIALOG_MENU)

function closeMenu() {
  ui.closeDialog(DIALOG_MENU)
}
</script>

<script lang="ts">
export default {
  name: 'AppMenu',
}
</script>
