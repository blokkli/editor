<template>
  <PluginMenuButton
    title="Einstellungen"
    description="Persönliche Einstellungen für den Editor"
    @click="onClick"
    secondary
    icon="cog"
  />
  <Teleport to="body">
    <transition appear name="bk-slide-up">
      <SettingsDialog v-if="showSettings" @cancel="showSettings = false" />
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { PluginMenuButton } from '#blokkli/plugins'
import SettingsDialog from './Dialog/index.vue'

const showSettings = ref(false)

const onClick = () => (showSettings.value = true)
</script>
