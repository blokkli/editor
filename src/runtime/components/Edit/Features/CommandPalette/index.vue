<template>
  <Teleport to="body">
    <div class="bk">
      <BlokkliTransition name="command-palette">
        <Palette v-if="isVisible" @close="isVisible = false" />
      </BlokkliTransition>
    </div>
  </Teleport>
  <PluginToolbarButton
    id="command_palette"
    :title="label"
    meta
    key-code="K"
    region="before-sidebar"
    :tour-text="
      $t(
        'commandPaletteTourText',
        'Easily perform actions using your keyboard by launching the command palette. Most of the features available using clicks is also available in the command palette.',
      )
    "
    icon="command"
    @click="isVisible = !isVisible"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, ref, computed } from '#imports'
import { PluginToolbarButton } from '#blokkli/plugins'
import { BlokkliTransition } from '#blokkli/components'
import Palette from './Palette/index.vue'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

defineBlokkliFeature({
  id: 'command-palette',
  icon: 'command',
  label: 'Command Palette',
  description:
    'Provides a command palette with search to access most UI features with a keyboard.',
  viewports: ['desktop'],
})

const { $t } = useBlokkli()

const isVisible = ref(false)

const label = computed(() => $t('commandPaletteOpen', 'Open Command Palette'))

onBlokkliEvent('window:clickAway', () => (isVisible.value = false))
</script>

<script lang="ts">
export default {
  name: 'CommandPalette',
}
</script>
