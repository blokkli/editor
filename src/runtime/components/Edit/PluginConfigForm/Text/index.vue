<template>
  <FormTextarea
    v-if="multiline"
    :label
    :required
    :placeholder
    :description
    v-model="value"
    :id="name"
    :minlength="minLength"
    :maxlength="maxLength"
  />
  <FormText
    v-else
    :id="name"
    :label
    :required
    :description
    :placeholder
    :minlength="minLength"
    :maxlength="maxLength"
    v-model="value"
  />
</template>

<script setup lang="ts">
import type { PluginConfigInputText } from '#blokkli/types'
import { FormText, FormTextarea } from '#blokkli/components'

defineProps<PluginConfigInputText>()

const value = defineModel<string>()
</script>
