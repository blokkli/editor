<template>
  <Teleport to="#bk-toolbar-menu">
    <div class="bk-toolbar-menu">
      <button class="bk-toolbar-menu-button" @click.prevent.stop="ui.menu.open">
        <Icon name="logo" />
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
        <button @click="ui.menu.close" :class="{ 'bk-is-active': menuOpen }">
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

const { ui } = useBlokkli()

const menuOpen = computed(() => ui.menu.isOpen.value)
</script>

<script lang="ts">
export default {
  name: 'AppMenu',
}
</script>
