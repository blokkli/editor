<template>
  <Teleport to="body">
    <div class="pb-sidebar" id="pb-sidebar-content" v-show="activeSidebar" />

    <div class="pb pb-top pb-control">
      <div class="pb pb-toolbar">
        <div class="pb-toolbar-area pb-is-menu">
          <div class="pb-toolbar-menu">
            <button
              class="pb-toolbar-menu-button"
              :class="{ 'pb-is-active': menuVisible }"
              @click="menuVisible = !menuVisible"
            >
              <IconClose v-if="menuVisible" />
              <IconMenu v-else />
            </button>

            <transition name="pb-menu" :duration="200">
              <div
                v-show="menuVisible"
                class="pb-toolbar-menu-list"
                id="pb-toolbar-menu"
              />
            </transition>
          </div>
        </div>

        <div class="pb-toolbar-container" id="pb-toolbar-after-menu"></div>

        <div class="pb-toolbar-container" id="pb-toolbar-before-title"></div>

        <div class="pb-toolbar-container pb-is-title" id="pb-toolbar-title" />

        <div class="pb-toolbar-container" id="pb-toolbar-after-title"></div>

        <div class="pb-toolbar-container" id="pb-toolbar-view-options"></div>

        <div class="pb-toolbar-container" id="pb-toolbar-before-sidebar"></div>

        <div class="pb-toolbar-container">
          <div class="pb-toolbar-tabs" id="pb-sidebar-tabs"></div>
        </div>

        <transition name="pb-fade" :duration="200">
          <div
            v-if="menuVisible"
            class="pb-toolbar-menu-overlay"
            @click="menuVisible = false"
          />
        </transition>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import IconMenu from './../Icons/Menu.vue'
import IconClose from './../Icons/Close.vue'

const { eventBus, activeSidebar } = useParagraphsBuilderStore()

const emit = defineEmits(['loaded'])

const menuVisible = ref(false)
const closeMenu = () => (menuVisible.value = false)

onMounted(() => {
  eventBus.on('closeMenu', closeMenu)
  emit('loaded')
})
onBeforeUnmount(() => {
  eventBus.off('closeMenu', closeMenu)
})
</script>
