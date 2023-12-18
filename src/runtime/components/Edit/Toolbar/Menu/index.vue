<template>
  <div class="bk-toolbar-area bk-is-menu">
    <div class="bk-toolbar-menu">
      <button
        class="bk-toolbar-menu-button"
        :class="{ 'bk-is-active': menuOpen }"
        @click.prevent.stop="menuOpen ? ui.menu.close() : ui.menu.open()"
      >
        <!-- <div class="bk-toolbar-menu-button-icon"> -->
        <!--   <div></div> -->
        <!--   <div></div> -->
        <!--   <div></div> -->
        <!-- </div> -->
        <Icon :name="menuOpen ? 'close' : 'logo'" />
      </button>

      <transition name="bk-menu" :duration="200">
        <div v-show="menuOpen" class="bk-toolbar-menu-list">
          <div id="bk-toolbar-menu-primary" />
          <div id="bk-toolbar-menu-secondary" />
        </div>
      </transition>
    </div>
  </div>
  <transition name="bk-fade" :duration="200">
    <div
      v-if="menuOpen"
      class="bk-toolbar-menu-overlay bk-overlay"
      @click="ui.menu.close()"
    />
  </transition>
</template>

<script setup lang="ts">
import { computed, useBlokkli, onMounted } from '#imports'
import { Icon } from '#blokkli/components'

const { ui } = useBlokkli()

const menuOpen = computed(() => ui.menu.isOpen.value)
</script>
