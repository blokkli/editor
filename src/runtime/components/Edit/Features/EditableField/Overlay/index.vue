<template>
  <div
    v-if="loaded"
    ref="root"
    :style="style"
    class="bk-editable-field bk-control"
  >
    <form
      ref="form"
      class="bk-editable-field-input"
      :style="formStyle"
      @submit.prevent="cancel"
    >
      <div class="bk bk-editable-field-buttons">
        <h3>
          <ItemIcon :bundle="itemBundle" />
          {{ label }}
        </h3>
        <button type="submit">
          <Icon name="close" />
          <span>{{ $t('cancel') }}</span>
        </button>
        <button :disabled="!hasChanged" @click.prevent="close(true)">
          <Icon name="save" />
          <span>{{ $t('save') }}</span>
        </button>
      </div>

      <InputContenteditable
        v-if="editableType === 'markup'"
        v-model="modelValue"
        :type="editableType"
        @close="close"
      />

      <InputFrame
        v-else-if="editableType === 'frame'"
        v-model="modelValue"
        :type="editableType"
        :field-name="fieldName"
        :uuid="block.uuid"
        :initial-height="scrollHeight"
        @close="close"
      />

      <InputPlaintext
        v-else
        v-model="modelValue"
        :element="element"
        :required="required"
        :maxlength="maxlength"
        @close="close"
        @save="close(true)"
      />

      <div v-if="!isMarkup" class="bk bk-editable-field-info">
        <div v-if="errorText" class="bk-editable-field-info-error">
          {{ errorText }}
        </div>
        <div class="bk-editable-field-info-count">
          <span>{{ count }}</span>
          <span v-if="maxlength">&nbsp;/&nbsp;{{ maxlength }}</span>
        </div>
      </div>
    </form>
  </div>
</template>

<script lang="ts" setup>
import type {
  BlokkliEditableDirectiveArgs,
  EditableType,
  DraggableExistingBlock,
} from '#blokkli/types'
import { Icon, ItemIcon } from '#blokkli/components'
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

const { eventBus, ui, selection, state, adapter, $t, types } = useBlokkli()

const props = defineProps<{
  fieldName: string
  block: DraggableExistingBlock
  element: HTMLElement
  args?: BlokkliEditableDirectiveArgs
  isComponent?: boolean
  value?: string
}>()

const getElement = (): HTMLElement => props.element

const scrollHeight = ref(0)
const loaded = ref(false)
const originalText = ref(props.value || '')
const modelValue = ref('')
const inputStyle = ref<Record<string, any>>({})
const form = ref<HTMLFormElement | null>(null)
const root = ref<HTMLDivElement | null>(null)
const style = computed(() => {
  if (ui.isMobile.value) {
    return {}
  } else {
    const artboardEl = ui.artboardElement()
    const artboardRect = artboardEl.getBoundingClientRect()
    const artboardScroll = artboardEl.scrollTop
    const scale = ui.getArtboardScale()
    const rect = props.element.getBoundingClientRect()
    const x = (rect.x - artboardRect.x) / scale
    const y = (rect.y - artboardRect.y) / scale + artboardScroll
    return {
      width: props.element.offsetWidth + 'px',
      top: y + 'px',
      left: x + 'px',
    }
  }
})

const formStyle = computed(() => {
  if (ui.isMobile.value) {
    return {}
  }
  return {
    transform: `translateX(-50%) scale(calc(1 / var(--bk-artboard-scale)))`,
  }
})

const hasChanged = computed(() => modelValue.value !== originalText.value)
const itemBundle = computed(() => props.block.itemBundle)
const maxlength = computed(() => props.args?.maxlength)
const required = computed(() => !!props.args?.required)
const label = computed(() =>
  [types.getType(itemBundle.value)?.label, props.args?.label || props.fieldName]
    .filter(falsy)
    .join(' » '),
)
const editableType = computed<EditableType>(
  () => props.args?.type || 'plaintext',
)
const isMarkup = computed(
  () =>
    editableType.value === 'table' ||
    editableType.value === 'markup' ||
    editableType.value === 'frame',
)

const count = computed(() => modelValue.value.length)

const errorText = computed(() => {
  if (required.value && !modelValue.value) {
    return $t('fieldIsRequired')
  }
})

const cancel = () => {
  close(false)
}

const close = async (save?: boolean) => {
  // Weird iOS bug: Close method is called twice, so we have to check if we
  // are actually still editing.
  if (!selection.editableActive.value) {
    return
  }
  if (save && errorText.value) {
    return
  }

  const el = getElement()

  if (save && props.block && modelValue.value !== originalText.value) {
    await state.mutateWithLoadingState(
      adapter.updateFieldValue!({
        uuid: props.block.uuid,
        fieldName: props.fieldName,
        fieldValue: modelValue.value,
      }),
    )
  }
  if (!save && el) {
    if (!props.isComponent) {
      if (isMarkup.value) {
        el.innerHTML = originalText.value
      } else {
        el.textContent = originalText.value
      }
    }
  }
  if (el) {
    el.dataset.blokkliEditableActive = undefined
  }
  selection.editableActive.value = false
}

watch(modelValue, (newText) => {
  if (props.element && selection.editableActive.value && !props.isComponent) {
    const el = getElement()
    if (editableType.value === 'plaintext') {
      el.textContent = newText
    } else {
      el.innerHTML = newText
    }
  }

  if (props.isComponent) {
    eventBus.emit('editable:update', {
      name: props.fieldName,
      entityUuid: props.block.uuid,
      value: newText,
    })
  }
})

const onEditableSave = () => {
  close(true)
}

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
    return
  }
}

onMounted(() => {
  eventBus.on('editable:save', onEditableSave)

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
    // if (input.value) {
    //   input.value.style.opacity = '0'
    //   input.value.focus()
    //   inputStyle.value.minHeight =
    //     Math.min(input.value.scrollHeight, 100) + 'px'
    //   input.value.style.opacity = '1'
    // }
  })
})

onBeforeUnmount(() => {
  const el = getElement()
  el.dataset.blokkliEditableActive = undefined
  eventBus.off('editable:save', onEditableSave)
})
</script>
