<template>
  <FormToggle :label :description v-model="value" />
</template>

<script setup lang="ts">
import type { PluginConfigInputCheckbox } from '#blokkli/types'
import { FormToggle } from '#blokkli/components'

defineProps<PluginConfigInputCheckbox>()

const value = defineModel<boolean>()
</script>
