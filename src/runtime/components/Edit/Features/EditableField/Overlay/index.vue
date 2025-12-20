<template>
  <ArtboardTooltip
    v-if="loaded"
    id="editable"
    :title
    :anchor-el="element"
    placement-y="top"
    class="bk-editable-field"
    close-icon="check"
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

      <div class="bk bk-editable-field-info">
        <button :disabled="!hasChanged" @click.prevent="discard">
          {{ $t('editableFieldDiscard', 'Discard') }}
        </button>
        <div v-if="errorText" class="bk-editable-field-info-error">
          {{ errorText }}
        </div>
        <div v-if="!isMarkup" class="bk-editable-field-info-count">
          <span>{{ count }}</span>
          <span v-if="maxlength >= 1">&nbsp;/&nbsp;{{ maxlength }}</span>
        </div>
      </div>
    </form>
  </ArtboardTooltip>
</template>

<script lang="ts" setup>
import type { EntityContext, EditableFieldConfig } from '#blokkli/types'
import { ArtboardTooltip } from '#blokkli/components'
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
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { FIELD_MAPPING } from '#blokkli-build/runtime-options'
import { itemEntityType } from '#blokkli-build/config'

const {
  eventBus,
  state,
  adapter,
  $t,
  types,
  element: elementProvider,
  definitions,
} = useBlokkli()

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
const originalMutatedProp = ref<string | undefined>(undefined)
const modelValue = ref('')
const form = useTemplateRef('form')
const isClosing = ref(false)

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

function findMatchingProp(mapping: Record<string, string>): string | null {
  return (
    Object.entries(mapping).find(
      ([_prop, fieldName]) => fieldName === props.fieldName,
    )?.[0] ?? null
  )
}

const providerDefinition = computed(() => {
  return definitions.getProviderDefinition(props.host.type, props.host.bundle)
})

const matchingProp = computed<string | null>(() => {
  if (props.host.type === itemEntityType) {
    const mapping = FIELD_MAPPING[props.host.bundle]
    if (mapping) {
      return findMatchingProp(mapping)
    }
  } else {
    if (providerDefinition.value) {
      const mapping = providerDefinition.value.propsFieldMapping
      if (mapping) {
        return findMatchingProp(mapping)
      }
    }
  }

  return null
})

const mutatedItemPropsKey = computed(() =>
  providerDefinition.value ? 'HOST' : props.host.uuid,
)

/**
 * Whether this editable modifies a prop via mutatedItemProps.
 */
const usesMutatedProps = computed(() => !!matchingProp.value)

/**
 * Whether this editable modifies the DOM directly.
 */
const usesDirectDom = computed(() => !props.isComponent && !matchingProp.value)

/**
 * Restore the original state when discarding changes.
 */
function restoreOriginalState() {
  // Restore mutatedItemProps if we modified it.
  if (usesMutatedProps.value && matchingProp.value) {
    const key = mutatedItemPropsKey.value
    if (originalMutatedProp.value === undefined) {
      // Remove the prop override entirely if there wasn't one before.
      if (state.mutatedItemProps[key]) {
        state.mutatedItemProps[key] = undefined
      }
    } else {
      // Restore the original value.
      if (state.mutatedItemProps[key]) {
        state.mutatedItemProps[key]![matchingProp.value] =
          originalMutatedProp.value
      }
    }
  }

  // Restore DOM content if we modified it directly.
  if (usesDirectDom.value) {
    const el = props.element
    if (isMarkup.value) {
      el.innerHTML = originalText.value
    } else {
      el.textContent = originalText.value
    }
  }

  // Notify the component if it's a component-based editable.
  if (props.isComponent) {
    eventBus.emit('editable:update', {
      name: props.fieldName,
      entityUuid: props.host.uuid,
      value: originalText.value,
    })
  }
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
  // Update mutatedItemProps for prop-based fields.
  if (usesMutatedProps.value && matchingProp.value) {
    if (!state.mutatedItemProps[mutatedItemPropsKey.value]) {
      state.mutatedItemProps[mutatedItemPropsKey.value] = {}
    }
    state.mutatedItemProps[mutatedItemPropsKey.value]![matchingProp.value] =
      newText
  }

  // Update DOM directly for non-component, non-prop fields.
  if (usesDirectDom.value) {
    const el = props.element
    if (props.config.type === 'plain') {
      el.textContent = newText
    } else {
      el.innerHTML = newText
    }
  }

  // Notify the component if it's a component-based editable.
  if (props.isComponent) {
    eventBus.emit('editable:update', {
      name: props.fieldName,
      entityUuid: props.host.uuid,
      value: newText,
    })
  }
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

  // Determine the initial value based on the field type.
  if (props.isComponent) {
    modelValue.value = props.value || ''
  } else if (matchingProp.value) {
    if (providerDefinition.value) {
      modelValue.value = state.mutatedEntity.value[matchingProp.value] || ''
    } else {
      modelValue.value =
        state.getFieldListItem(props.host.uuid)?.props?.[matchingProp.value] ??
        ''
    }
  } else if (isMarkup.value) {
    modelValue.value = el.innerHTML
  } else {
    modelValue.value = el.textContent || ''
  }

  // Store original values for potential discard.
  originalText.value = modelValue.value

  // Store original mutatedItemProps value if applicable.
  if (usesMutatedProps.value && matchingProp.value) {
    originalMutatedProp.value =
      state.mutatedItemProps[mutatedItemPropsKey.value]?.[matchingProp.value]
  }

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
