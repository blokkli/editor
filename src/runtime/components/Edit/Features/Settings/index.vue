<template>
  <PluginMenuButton
    id="settings"
    :title="$t('settingsMenuTitle', 'Settings')"
    :description="
      $t('settingsMenuDescription', 'Personal settings for the editor')
    "
    secondary
    icon="cog"
    @click="onClick"
  />
  <Teleport to="body">
    <transition appear name="bk-slide-up">
      <SettingsDialog v-if="showSettings" @cancel="showSettings = false" />
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, useBlokkli, defineBlokkliFeature, computed } from '#imports'
import { PluginMenuButton } from '#blokkli/plugins'
import SettingsDialog from './Dialog/index.vue'
import { addElementClasses } from '#blokkli/helpers/addElementClasses'

const { $t } = useBlokkli()

const { settings } = defineBlokkliFeature({
  id: 'settings',
  label: 'Settings',
  icon: 'cog',
  description: 'Provides a menu button to display a settings dialog.',

  settings: {
    useAnimations: {
      type: 'checkbox',
      default: true,
      label: 'Use animations',
      description:
        'Animates UI elements like dialogs or drawers or interactions like drag and drop or scroll changes.',
      group: 'advanced',
    },
    lowPerformanceMode: {
      type: 'checkbox',
      default: false,
      label: 'Enable low performance mode',
      description:
        'Reduces the animations and interactivity to a minimum for devices with low performance.',
      group: 'advanced',
    },
    resetAllSettings: {
      type: 'method',
      label: 'Reset all settings',
      method: (app) => {
        app.storage.clearAll()
      },
      group: 'advanced',
    },
  },
})

const showSettings = ref(false)

const onClick = () => (showSettings.value = true)

const lowPerformanceMode = computed(() => settings.value.lowPerformanceMode)

addElementClasses(
  document.documentElement,
  'bk-low-performance-mode',
  lowPerformanceMode,
)
</script>

<script lang="ts">
export default {
  name: 'Settings',
}
</script>
