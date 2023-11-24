<template>
  <PluginMenuButton
    title="Einstellungen"
    description="Persönliche Einstellungen für den Editor"
    @click="onClick"
    secondary
  >
    <Icon />
  </PluginMenuButton>
  <Teleport to="body">
    <transition appear name="pb-slide-up">
      <SettingsDialog v-if="showSettings" @cancel="showSettings = false" />
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import PluginMenuButton from './../../Plugin/MenuButton/index.vue'
import Icon from './../../Icons/Cog.vue'
import SettingsDialog from './Dialog/index.vue'

const showSettings = ref(false)

const onClick = () => (showSettings.value = true)
</script>
