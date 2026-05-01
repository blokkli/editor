<template>
  <div>
    <label class="bk-form-label" :for="id">
      {{ label }}<span v-if="required" class="bk-required-indicator">*</span>
    </label>
    <div class="bk-form-text">
      <input
        :id
        ref="inputRef"
        :value="value"
        type="text"
        class="bk-form-input"
        :placeholder
        :required
        :disabled
        :minlength
        :maxlength
        @[updateEvent]="onUpdate"
      />
      <button
        v-show="value"
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
import { computed, useBlokkli, useTemplateRef } from '#imports'

const props = defineProps<{
  id: string
  label: string
  description?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  minlength?: string | number
  maxlength?: string | number
  type?: string
  /**
   * If true, the model is only updated on `change` (blur / Enter), matching
   * Vue's `v-model.lazy` behavior. Defaults to eager (per-keystroke).
   */
  lazy?: boolean
}>()

const updateEvent = computed(() => (props.lazy ? 'change' : 'input'))

const value = defineModel<string>()

function onUpdate(event: Event) {
  value.value = (event.target as HTMLInputElement).value
}

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')

defineExpose({
  focus: () => inputRef.value?.focus(),
  select: () => inputRef.value?.select(),
})

const { $t } = useBlokkli()
</script>
