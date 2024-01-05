<template>
  <PluginMenuButton
    :title="$t('settingsMenuTitle')"
    :description="$t('settingsMenuDescription')"
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
import { ref, useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginMenuButton } from '#blokkli/plugins'
import SettingsDialog from './Dialog/index.vue'

const { $t, storage } = useBlokkli()

defineBlokkliFeature({
  id: 'settings',
  label: 'Settings',
  icon: 'cog',
  description: 'Provides a menu button to display a settings dialog.',

  settings: {
    useAnimations: {
      type: 'checkbox',
      default: true,
      label: 'Use animations',
      group: 'advanced',
    },
    resetAllSettings: {
      type: 'method',
      label: 'Reset all settings',
      method: () => {
        storage.clearAll()
      },
      group: 'advanced',
    },
  },
})

const showSettings = ref(false)

const onClick = () => (showSettings.value = true)
</script>

<script lang="ts">
export default {
  name: 'Settings',
}
</script>
