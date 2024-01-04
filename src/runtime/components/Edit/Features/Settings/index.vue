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

defineBlokkliFeature({
  id: 'settings',
  description: 'Provides a menu button to display a settings dialog.',
})

const { $t } = useBlokkli()

const showSettings = ref(false)

const onClick = () => (showSettings.value = true)
</script>

<script lang="ts">
export default {
  name: 'Settings',
}
</script>
