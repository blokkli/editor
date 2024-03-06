<template>
  <Teleport to="#bk-toolbar-menu">
    <div class="bk-toolbar-menu">
      <button class="bk-toolbar-menu-button" @click.prevent.stop="onClick">
        <Icon name="menu" />
      </button>
    </div>
  </Teleport>
  <Teleport to="body">
    <transition name="bk-fade" :duration="200">
      <div
        v-if="menuOpen"
        class="bk bk-menu-overlay bk-overlay"
        @click="ui.menu.close()"
      />
    </transition>
    <transition name="bk-menu" :duration="200">
      <div v-show="menuOpen" class="bk bk-menu-list">
        <button :class="{ 'bk-is-active': menuOpen }" @click="ui.menu.close">
          <Icon name="close" />
        </button>
        <div class="bk-menu-list-inner">
          <div id="bk-menu-primary" />
          <div id="bk-menu-secondary" />
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/components'

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
