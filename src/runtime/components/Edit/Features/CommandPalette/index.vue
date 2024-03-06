<template>
  <Teleport to="body">
    <div class="bk">
      <Transition name="bk-command-palette">
        <Palette v-if="isVisible" @close="isVisible = false" />
      </Transition>
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
        'Easily perform an action using your keyboard by launching the command palette and fuzzy find menu links, change options and perform actions.',
      )
    "
    icon="command"
    @click="isVisible = true"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, ref, computed } from '#imports'
import { PluginToolbarButton } from '#blokkli/plugins'
import Palette from './Palette/index.vue'

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
</script>

<script lang="ts">
export default {
  name: 'CommandPalette',
}
</script>
