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
    <form ref="form" class="bk-editable-field-input" @submit.prevent="close">
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
          @close="save"
        />

        <InputPlaintext
          v-else
          v-model="modelValue"
          :element="element"
          :required="required"
          :maxlength="maxlength"
          @close="cancel"
          @save="save"
        />
      </div>

      <div class="bk bk-editable-field-info">
        <button :disabled="!hasChanged" @click.prevent="cancel">
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
import type {
  EntityContext,
  EditableFieldConfig,
  BlockBundleDefinition,
} from '#blokkli/types'
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
  selection,
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

const shouldSave = ref(true)

const cancel = () => {
  shouldSave.value = false
  close()
  emit('close')
}

const save = () => {
  shouldSave.value = true
  close()
  emit('close')
}

// Save the editable when clicking away from the text area.
onBlokkliEvent('window:clickAway', save)

const getElement = (): HTMLElement => props.element

const scrollHeight = ref(0)
const loaded = ref(false)
const originalText = ref(props.value || '')
const modelValue = ref('')
const inputStyle = ref<Record<string, any>>({})
const form = useTemplateRef('form')
const input = useTemplateRef('input')

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

const close = async () => {
  // Weird iOS bug: Close method is called twice, so we have to check if we
  // are actually still editing.
  if (!selection.editableActive.value) {
    return
  }
  if (shouldSave.value && errorText.value) {
    return
  }

  const el = getElement()

  if (shouldSave.value && hasChanged.value) {
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

  if (!shouldSave.value && el && !props.isComponent && !matchingProp.value) {
    if (isMarkup.value) {
      el.innerHTML = originalText.value
    } else {
      el.textContent = originalText.value
    }
  }
}

const blockDefinition = computed<BlockBundleDefinition | null>(() => {
  if (props.host.type === itemEntityType) {
    return types.getBlockBundleDefinition(props.host.bundle) ?? null
  }

  return null
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

watch(modelValue, (newText) => {
  if (matchingProp.value) {
    if (!state.mutatedItemProps[mutatedItemPropsKey.value]) {
      state.mutatedItemProps[mutatedItemPropsKey.value] = {}
    }
    state.mutatedItemProps[mutatedItemPropsKey.value]![matchingProp.value] =
      newText
  } else if (
    props.element &&
    selection.editableActive.value &&
    !props.isComponent
  ) {
    const el = getElement()
    if (props.config.type === 'plain') {
      el.textContent = newText
    } else {
      el.innerHTML = newText
    }
  }

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
  const el = getElement()

  if (props.isComponent) {
    modelValue.value = props.value || ''
  } else {
    if (matchingProp.value) {
      if (providerDefinition.value) {
        modelValue.value = state.mutatedEntity.value[matchingProp.value] || ''
      } else {
        modelValue.value =
          state.getFieldListItem(props.host.uuid)?.props?.[
            matchingProp.value
          ] ?? ''
      }
    } else if (isMarkup.value) {
      modelValue.value = el.innerHTML
    } else {
      modelValue.value = el.textContent || ''
    }
  }

  originalText.value = modelValue.value

  selection.editableActive.value = true

  const computedStyle = window.getComputedStyle(el)
  inputStyle.value = {
    textAlign: computedStyle.textAlign,
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
  await close()
})
</script>
