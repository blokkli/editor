<template>
  <div>
    <label class="bk-form-label" :for="id">
      {{ label }}<span v-if="required" class="bk-required-indicator">*</span>
    </label>
    <div class="bk-form-text">
      <input
        :id
        v-model.lazy="value"
        type="text"
        class="bk-form-input"
        :placeholder
        :required
        :disabled
        :minlength
        :maxlength
      />
      <button
        type="button"
        :title="$t('clearInput', 'Clear input')"
        @click.prevent="value = ''"
      >
        <Icon name="bk_mdi_close" />
      </button>
    </div>
    <div v-if="description" class="bk-form-description">{{ description }}</div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/editor/components'
import { useBlokkli } from '#imports'

defineProps<{
  id: string
  label: string
  description?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  minlength?: string | number
  maxlength?: string | number
  type?: string
}>()

const value = defineModel<string>()

const { $t } = useBlokkli()
</script>
