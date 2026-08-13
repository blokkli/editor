<template>
  <div data-test="translations-batch-editor">
    <div class="border border-mono-300 bg-white">
      <FlexTextarea
        v-if="configType === 'plain'"
        v-model="modelValue"
        data-test="translations-batch-editor-input"
        textarea-class
        autofocus
        submit-on-enter
        :max-height="400"
        @submit="save"
        @keydown="onKeydown"
      />
      <InputFrame
        v-else
        ref="inputFrame"
        v-model="modelValue"
        type="frame"
        :field-name="fieldName"
        :host="host"
        :initial-height="400"
        :is-fullscreen="false"
        @ready="onFrameReady"
      />
    </div>
    <div class="flex gap-10 mt-10">
      <button
        class="bk-button bk-scheme-accent bk-is-small"
        data-test="translations-batch-editor-save"
        @click.prevent="save"
      >
        {{ $t('save', 'Save') }}
      </button>
      <button
        class="bk-button bk-is-small"
        data-test="translations-batch-editor-cancel"
        @click.prevent="$emit('cancel')"
      >
        {{ $t('cancel', 'Cancel') }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef, useBlokkli } from '#imports'
import { FlexTextarea } from '#blokkli/editor/components'
import InputFrame from '#blokkli/editor/features/editable-field/Overlay/Frame/index.vue'
import type { EntityContext } from '#blokkli/types'

const props = defineProps<{
  uuid: string
  fieldName: string
  entityType: string
  entityBundle: string
  /** The value the editor opens with (edited ?? proposed ?? current). */
  seed: string
  /** `plain` → autosizing textarea, `frame` → backend editor iframe. */
  configType: 'plain' | 'frame'
}>()

const emit = defineEmits<{
  save: [value: string]
  cancel: []
}>()

const { $t } = useBlokkli()

const modelValue = ref(props.seed)
const inputFrame = useTemplateRef('inputFrame')

const host = computed<EntityContext>(() => ({
  type: props.entityType,
  bundle: props.entityBundle,
  uuid: props.uuid,
}))

/**
 * Push the seed into the backend editor once its iframe is ready — the same
 * controlled pattern the diff approval edit uses. The iframe echoes the value
 * back into the model.
 */
function onFrameReady() {
  inputFrame.value?.setValue(modelValue.value)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('cancel')
  }
}

function save() {
  emit('save', modelValue.value)
}

defineOptions({
  name: 'TranslateDialogEditor',
})
</script>
