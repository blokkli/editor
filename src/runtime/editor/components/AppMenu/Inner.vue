<template>
  <div
    class="bk fixed inset-y-0 left-0 bg-white shadow-lg max-w-[480px] lg:min-w-[400px] flex flex-col pointer-events-auto z-menu w-[calc(100vw-40px)]"
    data-test="app-menu"
    @wheel.passive.stop
    @touchstart.stop.passive
    @touchmove.stop.passive
  >
    <button
      class="h-40 md:h-50 flex items-center text-base font-bold pl-15 md:pl-25 bg-white text-mono-950"
      data-test="app-menu-close"
      @click="$emit('close')"
    >
      <Icon name="bk_mdi_close" class="size-20 md:size-30 mr-25" />
    </button>
    <div class="flex-1 overflow-auto flex flex-col bg-mono-200">
      <div
        id="bk-menu-primary"
        class="grid border-t border-t-mono-200 bg-white"
      >
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
      <div id="bk-menu-secondary" class="mt-auto grid grid-cols-2">
        <MenuButton
          v-for="button in secondaryButtons"
          :id="button.id"
          :key="button.id"
          :title="button.title"
          :description="button.description"
          :icon="button.icon"
          :type="button.type"
          :disabled="button.disabled"
          small
          @click="onClick(button)"
        />
      </div>
      <aside
        class="px-15 py-10 text-xs bg-accent-600 text-white items-center leading-none flex justify-between"
      >
        <div class="flex gap-5 items-center">
          <Icon
            name="logo"
            class="bg-white size-20 flex items-center justify-center rounded text-accent-600"
          />
          <div><strong>@blokkli/editor</strong> {{ blokkliVersion }}</div>
        </div>

        <div>
          <a
            href="https://www.blokk.li"
            target="_blank"
            class="hover:text-accent-700 hover:underline"
            >blokk.li</a
          >
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import { blokkliVersion } from '#blokkli-build/editor-config'
import MenuButton from './MenuButton.vue'
import type { MenuButtonPlugin } from '#blokkli/editor/providers/plugin'

const { plugins, ui } = useBlokkli()

const emit = defineEmits<{
  (e: 'close'): void
}>()

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

async function onClick(button: MenuButtonPlugin) {
  // Persist any pending option changes before running the menu action (e.g.
  // publish must include the latest options).
  await ui.flushPendingChanges()
  button.callback()
  emit('close')
}
</script>
