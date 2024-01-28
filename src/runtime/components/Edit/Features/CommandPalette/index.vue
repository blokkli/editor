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
} from '#imports'
import Palette from './Palette/index.vue'

defineBlokkliFeature({
  id: 'command-palette',
  icon: 'command',
  label: 'Command Palette',
  description:
    'Provides a command palette with search to access most UI features with a keyboard.',
})

const { eventBus } = useBlokkli()

const isVisible = ref(false)

const onKeyPressed = (e: KeyPressedEvent) => {
  if (e.code === 'k' && e.meta) {
    e.originalEvent.preventDefault()
    isVisible.value = !isVisible.value
  }
}

onMounted(() => {
  eventBus.on('keyPressed', onKeyPressed)
})

onBeforeUnmount(() => {
  eventBus.off('keyPressed', onKeyPressed)
})
</script>

<script lang="ts">
export default {
  name: 'CommandPalette',
}
</script>
