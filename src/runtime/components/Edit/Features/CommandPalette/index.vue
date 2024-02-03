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
import defineShortcut from '#blokkli/helpers/composables/defineShortcut'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { useBlokkli, defineBlokkliFeature, ref } from '#imports'
import Palette from './Palette/index.vue'

defineBlokkliFeature({
  id: 'command-palette',
  icon: 'command',
  label: 'Command Palette',
  description:
    'Provides a command palette with search to access most UI features with a keyboard.',
})

const { $t } = useBlokkli()

const isVisible = ref(false)

onBlokkliEvent('keyPressed', (e) => {
  if (e.code === 'k' && e.meta) {
    e.originalEvent.preventDefault()
    isVisible.value = !isVisible.value
  }
})

defineShortcut({
  meta: true,
  code: 'k',
  label: $t('commandPalette.open', 'Open Command Palette'),
  group: 'general',
})
</script>

<script lang="ts">
export default {
  name: 'CommandPalette',
}
</script>
