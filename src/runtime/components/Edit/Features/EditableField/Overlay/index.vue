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
} from '#imports'
import { falsy } from '#blokkli/helpers'
import InputPlaintext from './Plaintext/index.vue'
import InputContenteditable from './Contenteditable/index.vue'
import InputFrame from './Frame/index.vue'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const { eventBus, selection, state, adapter, $t, types } = useBlokkli()

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
const form = ref<HTMLFormElement | null>(null)
const input = ref<HTMLDivElement | null>(null)

const hasChanged = computed(() => modelValue.value !== originalText.value)
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

  if (shouldSave.value && modelValue.value !== originalText.value) {
    if ('itemBundle' in props.host) {
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
  if (!shouldSave.value && el && !props.isComponent) {
    if (isMarkup.value) {
      el.innerHTML = originalText.value
    } else {
      el.textContent = originalText.value
    }
  }
  if (el) {
    el.dataset.blokkliEditableActive = undefined
  }
}

watch(modelValue, (newText) => {
  if (props.element && selection.editableActive.value && !props.isComponent) {
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

  const textarea = el.querySelector('textarea')
  if (textarea) {
    textarea.focus()
    return
  }

  const editable = el.querySelector('[contenteditable]')
  if (editable instanceof HTMLElement) {
    editable.focus()
    return
  }

  const iframe = el.querySelector('iframe')

  if (iframe?.contentDocument) {
    focusInput(iframe.contentDocument)
  }
}

onMounted(() => {
  const el = getElement()

  if (props.isComponent) {
    modelValue.value = props.value || ''
  } else {
    if (isMarkup.value) {
      modelValue.value = el.innerHTML
    } else {
      modelValue.value = el.textContent || ''
    }
  }

  originalText.value = modelValue.value

  selection.editableActive.value = true
  el.dataset.blokkliEditableActive = 'true'

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
  const el = getElement()
  await close()
  el.dataset.blokkliEditableActive = undefined
})
</script>
