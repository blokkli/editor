<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <SettingsDialog v-if="showSettings" @cancel="onClose" />
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, computed } from '#imports'
import SettingsDialog from './Dialog/index.vue'
import { BlokkliTransition } from '#blokkli/editor/components'
import { addElementClasses, defineMenuButton } from '#blokkli/editor/composables'

const { ui, $t } = useBlokkli()

const { settings } = defineBlokkliFeature({
  id: 'settings',
  label: 'Settings',
  icon: 'bk_mdi_settings',
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

const showSettings = computed(() => ui.currentDialog.value?.id === 'settings')

function onClick() {
  ui.openDialog({ id: 'settings', alignment: 'center' })
}

function onClose() {
  ui.closeDialog('settings')
}

const lowPerformanceMode = computed(() => settings.value.lowPerformanceMode)

addElementClasses(
  document.documentElement,
  'bk-low-performance-mode',
  lowPerformanceMode,
)

defineMenuButton(() => {
  return {
    id: 'settings',
    title: $t('settingsMenuTitle', 'Settings'),
    description: $t(
      'settingsMenuDescription',
      'Personal settings for the editor',
    ),
    icon: 'bk_mdi_settings',
    secondary: true,
    callback: onClick,
  }
})
</script>

<script lang="ts">
export default {
  name: 'Settings',
}
</script>
