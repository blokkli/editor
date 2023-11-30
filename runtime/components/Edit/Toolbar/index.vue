<template>
  <Teleport to="body">
    <div class="pb-sidebar" id="pb-sidebar-content" />

    <div class="pb pb-top pb-control">
      <div class="pb pb-toolbar">
        <div class="pb-toolbar-area pb-is-menu">
          <div class="pb-toolbar-menu">
            <button
              class="pb-toolbar-menu-button"
              :class="{ 'pb-is-active': menuOpen }"
              @click="menuOpen ? ui.menu.close() : ui.menu.open()"
            >
              <Icon :name="menuOpen ? 'close' : 'logo'" />
            </button>

            <transition name="pb-menu" :duration="200">
              <div v-show="menuOpen" class="pb-toolbar-menu-list">
                <div id="pb-toolbar-menu-primary" />
                <div id="pb-toolbar-menu-secondary" />
              </div>
            </transition>
          </div>
        </div>

        <div class="pb-toolbar-container" id="pb-toolbar-after-menu" />

        <div class="pb-toolbar-container" id="pb-toolbar-before-title" />

        <div class="pb-toolbar-container pb-is-title" id="pb-toolbar-title" />

        <div class="pb-toolbar-container" id="pb-toolbar-after-title" />

        <div class="pb-toolbar-container" id="pb-toolbar-before-view-options" />

        <div class="pb-toolbar-container" id="pb-toolbar-view-options" />

        <div class="pb-toolbar-container" id="pb-toolbar-before-sidebar" />

        <div class="pb-toolbar-container">
          <div class="pb-toolbar-tabs" id="pb-sidebar-tabs" />
        </div>

        <transition name="pb-fade" :duration="200">
          <div
            v-if="menuOpen"
            class="pb-toolbar-menu-overlay pb-overlay"
            @click="ui.menu.close()"
          />
        </transition>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { Icon } from '#pb/components'

const { ui } = useBlokkli()

const emit = defineEmits(['loaded'])

const menuOpen = computed(() => ui.menu.isOpen.value)

onMounted(() => {
  emit('loaded')
})
</script>
