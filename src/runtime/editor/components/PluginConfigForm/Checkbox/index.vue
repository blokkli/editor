<template>
  <FormToggle v-model="value" :label :description />
</template>

<script setup lang="ts">
import { FormToggle } from '#blokkli/editor/components'
import type { PluginConfigInputCheckbox } from '#blokkli/editor/types/pluginConfig';

defineProps<PluginConfigInputCheckbox>()

const value = defineModel<boolean>()
</script>
