<template>
  <Teleport to="#bk-toolbar-menu">
    <div class="bk-toolbar-menu">
      <button class="bk-toolbar-menu-button" @click.prevent.stop="onClick">
        <Icon name="menu" />
      </button>
    </div>
  </Teleport>
  <Teleport to="body">
    <BlokkliTransition name="fade">
      <div
        v-if="menuOpen"
        class="bk bk-menu-overlay bk-overlay"
        @click="ui.menu.close()"
      />
    </BlokkliTransition>
    <BlokkliTransition name="menu">
      <div v-show="menuOpen" class="bk bk-menu-list">
        <button :class="{ 'bk-is-active': menuOpen }" @click="ui.menu.close">
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
  </Teleport>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { Icon, BlokkliTransition } from '#blokkli/components'
import { blokkliVersion } from '#blokkli-build/config'

const { ui, eventBus } = useBlokkli()

const menuOpen = computed(() => ui.menu.isOpen.value)

const onClick = () => {
  eventBus.emit('select', '')
  ui.menu.open()
}
</script>

<script lang="ts">
export default {
  name: 'AppMenu',
}
</script>
