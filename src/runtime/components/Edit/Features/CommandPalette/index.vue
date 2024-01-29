<template>
  <Teleport to="body">
    <div class="bk">
      <Transition name="bk-command-palette">
        <Palette v-if="isVisible" @close="isVisible = false" />
      </Transition>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import type { KeyPressedEvent } from '#blokkli/types'
import {
  useBlokkli,
  defineBlokkliFeature,
  onMounted,
  onBeforeUnmount,
  ref,
  computed,
} from '#imports'
import Palette from './Palette/index.vue'

defineBlokkliFeature({
  id: 'command-palette',
  icon: 'command',
  label: 'Command Palette',
  description:
    'Provides a command palette with search to access most UI features with a keyboard.',
})

const { eventBus, keyboard, $t } = useBlokkli()

const isVisible = ref(false)

const onKeyPressed = (e: KeyPressedEvent) => {
  if (e.code === 'k' && e.meta) {
    e.originalEvent.preventDefault()
    isVisible.value = !isVisible.value
  }
}

const shortcut = computed(() => {
  return {
    meta: true,
    code: 'k',
    label: $t('commandPalette.open', 'Open Command Palette'),
    group: 'general',
  }
})

onMounted(() => {
  eventBus.on('keyPressed', onKeyPressed)
  keyboard.registerShortcut(shortcut.value)
})

onBeforeUnmount(() => {
  eventBus.off('keyPressed', onKeyPressed)
  keyboard.unregisterShortcut(shortcut.value)
})
</script>

<script lang="ts">
export default {
  name: 'CommandPalette',
}
</script>
