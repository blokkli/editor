<template>
  <Teleport to="body">
    <div id="bk-sidebar-content" class="bk-sidebar" />

    <div class="bk bk-top bk-control">
      <div class="bk bk-toolbar">
        <div class="bk-toolbar-area bk-is-menu">
          <div class="bk-toolbar-menu">
            <button
              class="bk-toolbar-menu-button"
              :class="{ 'bk-is-active': menuOpen }"
              @click="menuOpen ? ui.menu.close() : ui.menu.open()"
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

        <div id="bk-toolbar-after-menu" class="bk-toolbar-container" />

        <div id="bk-toolbar-before-title" class="bk-toolbar-container" />

        <div id="bk-toolbar-title" class="bk-toolbar-container bk-is-title" />

        <div id="bk-toolbar-after-title" class="bk-toolbar-container" />

        <div id="bk-toolbar-before-view-options" class="bk-toolbar-container" />

        <div id="bk-toolbar-view-options" class="bk-toolbar-container" />

        <div id="bk-toolbar-before-sidebar" class="bk-toolbar-container" />

        <div class="bk-toolbar-container">
          <div id="bk-sidebar-tabs" class="bk-toolbar-tabs" />
        </div>

        <transition name="bk-fade" :duration="200">
          <div
            v-if="menuOpen"
            class="bk-toolbar-menu-overlay bk-overlay"
            @click="ui.menu.close()"
          />
        </transition>
      </div>
    </div>
    <!-- <div class="bk bk-bottom bk-control"> -->
    <!--   <div class="bk-toolbar-container" id="bk-toolbar-bottom-left" /> -->
    <!--   <div class="bk-toolbar-container" id="bk-toolbar-bottom-right" /> -->
    <!-- </div> -->
  </Teleport>
</template>

<script lang="ts" setup>
import { Icon } from '#blokkli/components'

const { ui } = useBlokkli()
const emit = defineEmits(['loaded'])
const menuOpen = computed(() => ui.menu.isOpen.value)

onMounted(() => {
  emit('loaded')
})
</script>
