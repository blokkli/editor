<template>
  <ArtboardTooltip
    v-if="loaded"
    id="editable"
    :title
    :anchor-el="element"
    placement-y="top"
    class="bk-editable-field"
    close-icon="bk_mdi_check"
    @close="save"
  >
    <form ref="form" class="bk-editable-field-input" @submit.prevent="save">
      <div ref="input">
        <InputContenteditable
          v-if="config.type === 'markup'"
          v-model="modelValue"
          :type="config.type"
          @close="save"
        />

        <InputFrame
          v-else-if="config.type === 'frame'"
          v-model="modelValue"
          :type="config.type"
          :field-name="fieldName"
          :host="host"
          :initial-height="scrollHeight"
        />

        <InputPlaintext
          v-else
          v-model="modelValue"
          :element="element"
          :required="required"
          :maxlength="maxlength"
          @discard="discard"
          @save="save"
        />
      </div>

      <div class="bk-artboard-tooltip-info">
        <button :disabled="!hasChanged" @click.prevent="discard">
          {{ $t('editableFieldDiscard', 'Discard') }}
        </button>
        <div v-if="errorText" class="bk-editable-field-info-error">
          {{ errorText }}
        </div>
        <div
          v-else-if="config.type === 'plain'"
          class="bk-editable-field-info-hint"
        >
          {{ $t('textareaNewLineHint', 'Shift + Enter for new line') }}
        </div>
        <ReadabilityIndicator
          v-if="isReadabilityField"
          :text="modelValue"
          :field-type="readabilityFieldType"
        />
        <div v-if="!isMarkup" class="bk-editable-field-info-count">
          <span>{{ count }}</span>
          <span v-if="maxlength >= 1">&nbsp;/&nbsp;{{ maxlength }}</span>
        </div>
      </div>
    </form>
    <ChunkOverlay
      v-if="isReadabilityField && isMarkup"
      :text="modelValue"
      :field-type="readabilityFieldType"
      :element="element"
    />
  </ArtboardTooltip>
</template>

<script lang="ts" setup>
import type { EntityContext } from '#blokkli/types'
import { ArtboardTooltip } from '#blokkli/editor/components'
import {
  computed,
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  useBlokkli,
  nextTick,
  useTemplateRef,
} from '#imports'
import { falsy } from '#blokkli/helpers'
import InputPlaintext from './Plaintext/index.vue'
import InputContenteditable from './Contenteditable/index.vue'
import InputFrame from './Frame/index.vue'
import { itemEntityType } from '#blokkli-build/config'
import {
  onBlokkliEvent,
  useEditableFieldOverride,
} from '#blokkli/editor/composables'
import type { EditableFieldConfig } from '../types'
import ReadabilityIndicator from './ReadabilityIndicator/index.vue'
import ChunkOverlay from './ReadabilityIndicator/ChunkOverlay.vue'

const { state, adapter, $t, types, element: elementProvider } = useBlokkli()

const props = defineProps<{
  fieldName: string
  host: EntityContext
  element: HTMLElement
  config: EditableFieldConfig
  isComponent?: boolean
  value?: string
}>()

const emit = defineEmits(['close'])

// Refs
const scrollHeight = ref(0)
const loaded = ref(false)
const originalText = ref('')
const modelValue = ref('')
const form = useTemplateRef('form')
const isClosing = ref(false)

// Create field override for live preview via the correct update strategy.
const override = useEditableFieldOverride(props.fieldName, props.host)

// Computed properties
const hasChanged = computed(
  () => modelValue.value.trim() !== originalText.value.trim(),
)
const itemBundle = computed(() => props.host.bundle)
const maxlength = computed(() => props.config.maxLength)
const required = computed(() => !!props.config.required)
const title = computed(() => {
  if (itemBundle.value) {
    return [
      types.getBlockBundleDefinition(itemBundle.value)?.label,
      props.config.label,
    ]
      .filter(falsy)
      .join(' » ')
  }

  return props.config.label
})
const isMarkup = computed(
  () =>
    props.config.type === 'table' ||
    props.config.type === 'markup' ||
    props.config.type === 'frame',
)

const count = computed(() => modelValue.value.length)

const errorText = computed(() => {
  if (required.value && !modelValue.value) {
    return $t('fieldIsRequired', 'This field is required')
  }

  return undefined
})

const isReadabilityField = computed(
  () =>
    props.config.type === 'plain' ||
    props.config.type === 'markup' ||
    props.config.type === 'frame',
)

const readabilityFieldType = computed<'plain' | 'markup'>(() =>
  props.config.type === 'frame' || props.config.type === 'markup'
    ? 'markup'
    : 'plain',
)

/**
 * Restore the original state when discarding changes.
 */
function restoreOriginalState() {
  override.restore()
}

/**
 * Persist the changed value via the adapter.
 */
async function persistValue() {
  if (props.host.type === itemEntityType) {
    await state.mutateWithLoadingState(() =>
      adapter.updateFieldValue!({
        uuid: props.host.uuid,
        fieldName: props.fieldName,
        fieldValue: modelValue.value,
      }),
    )
  } else if (adapter.updateEntityFieldValue) {
    await state.mutateWithLoadingState(() =>
      adapter.updateEntityFieldValue!({
        fieldName: props.fieldName,
        fieldValue: modelValue.value,
      }),
    )
  }
}

/**
 * Discard changes and restore original state.
 */
function discard() {
  if (isClosing.value) {
    return
  }
  isClosing.value = true

  if (hasChanged.value) {
    restoreOriginalState()
  }
  emit('close')
}

/**
 * Save changes if valid, otherwise restore original state.
 */
async function save() {
  if (isClosing.value) {
    return
  }
  isClosing.value = true

  if (hasChanged.value) {
    if (errorText.value) {
      // Validation error: restore original state instead of saving.
      restoreOriginalState()
    } else {
      await persistValue()
    }
  }
  emit('close')
}

// Save the editable when clicking away from the text area.
onBlokkliEvent('window:clickAway', save)

// Update the live preview as the user types.
watch(modelValue, (newText) => {
  override.setValue(newText)
})

const focusInput = (el?: HTMLElement | Document | null) => {
  if (!el) {
    return
  }

  const queryEl = el instanceof Document ? el.documentElement : el

  const textarea = elementProvider.query<HTMLTextAreaElement>(
    queryEl,
    'textarea',
    'Focus editable field textarea',
  )
  if (textarea) {
    textarea.focus()
    return
  }

  const editable = elementProvider.query<HTMLElement>(
    queryEl,
    '[contenteditable]',
    'Focus editable field contenteditable',
  )
  if (editable) {
    editable.focus()
    return
  }

  const iframe = elementProvider.query<HTMLIFrameElement>(
    queryEl,
    'iframe',
    'Find iframe in editable field',
  )

  if (iframe?.contentDocument) {
    focusInput(iframe.contentDocument)
  }
}

onMounted(() => {
  const el = props.element

  // Use the composable's captured original value, or the component's value prop.
  if (props.isComponent) {
    modelValue.value = props.value || ''
  } else {
    modelValue.value = override.originalValue
  }

  originalText.value = modelValue.value

  nextTick(() => {
    scrollHeight.value = el.scrollHeight
    loaded.value = true
    nextTick(() => {
      focusInput(form.value)
    })
  })
})

onBeforeUnmount(async () => {
  // If save() or discard() already ran, skip - they handled everything.
  if (isClosing.value) {
    return
  }

  // We're being unmounted due to key change (user opened another editable).
  // Default to save behavior.
  if (hasChanged.value && !errorText.value) {
    await persistValue()
  }
})
</script>
