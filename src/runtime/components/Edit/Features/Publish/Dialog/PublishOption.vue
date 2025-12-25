<template>
  <label
    class="bk-publish-option"
    :class="[
      'bk-is-' + color,
      {
        'bk-is-disabled': disabled,
      },
    ]"
  >
    <input
      v-model="value"
      type="radio"
      :value="id"
      required
      name="publish-mode"
      :disabled
    />
    <div class="bk-publish-option-icon">
      <Icon :name="icon" />
      <div class="bk-publish-option-icon-check">
        <Icon name="bk_mdi_check" />
      </div>
    </div>
    <div>
      <div class="bk-publish-option-label">
        {{ label }}
      </div>
      <div class="bk-publish-option-description">
        {{ description }}
      </div>
    </div>
  </label>
</template>

<script setup lang="ts">
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon } from '#blokkli/components'

export type PublishOptionProps = {
  id: string
  label: string
  description: string
  icon: BlokkliIcon
  color: 'lime' | 'yellow' | 'red'
  disabled?: boolean
}

defineProps<PublishOptionProps>()

const value = defineModel<string>()
</script>
