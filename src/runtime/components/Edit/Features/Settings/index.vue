<template>
  <PluginMenuButton
    :title="text('settingsMenuTitle')"
    :description="text('settingsMenuDescription')"
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
import { ref, useBlokkli } from '#imports'
import { PluginMenuButton } from '#blokkli/plugins'
import SettingsDialog from './Dialog/index.vue'

const { text } = useBlokkli()

const showSettings = ref(false)

const onClick = () => (showSettings.value = true)
</script>

<script lang="ts">
export default {
  name: 'Settings',
}
</script>
