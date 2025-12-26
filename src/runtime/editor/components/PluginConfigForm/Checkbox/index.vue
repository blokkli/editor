<template>
  <FormToggle v-model="value" :label :description />
</template>

<script setup lang="ts">
import type { PluginConfigInputCheckbox } from '#blokkli/types'
import { FormToggle } from '#blokkli/editor/components'

defineProps<PluginConfigInputCheckbox>()

const value = defineModel<boolean>()
</script>
