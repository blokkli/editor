<template>
  <div
    ref="root"
    v-if="loaded"
    :style="style"
    class="bk-editable-field bk-control"
  >
    <form
      ref="form"
      class="bk-editable-field-input"
      @submit.prevent="cancel"
      :style="formStyle"
    >
      <div class="bk bk-editable-field-buttons">
        <h3>
          <ItemIcon :bundle="itemBundle" />
          {{ label }}
        </h3>
        <button type="submit">
          <Icon name="close" />
          <span>{{ translationText('cancel') }}</span>
        </button>
        <button @click.prevent="close(true)" :disabled="!hasChanged">
          <Icon name="save" />
          <span>{{ translationText('save') }}</span>
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
  BlokkliEditableType,
  DraggableExistingBlokkliItem,
} from '#blokkli/types'
import { Icon, ItemIcon } from '#blokkli/components'
import {
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

const {
  eventBus,
  ui,
  selection,
  state,
  adapter,
  text: translationText,
  types,
} = useBlokkli()

const props = defineProps<{
  fieldName: string
  block: DraggableExistingBlokkliItem
  element: HTMLElement
  args?: BlokkliEditableDirectiveArgs
}>()

const getElement = (): HTMLElement => props.element

const scrollHeight = ref(0)
const offsetY = ref(0)
const loaded = ref(false)
const originalText = ref('')
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
    transform: `translateY(${offsetY.value}px) translateX(-50%) scale(calc(1 / var(--bk-artboard-scale)))`,
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
const editableType = computed<BlokkliEditableType>(
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
    return translationText('fieldIsRequired')
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
      adapter.updateFieldValue({
        uuid: props.block.uuid,
        fieldName: props.fieldName,
        fieldValue: modelValue.value,
      }),
    )
  }
  if (!save && el) {
    if (isMarkup.value) {
      el.innerHTML = originalText.value
    } else {
      el.textContent = originalText.value
    }
  }
  if (el) {
    el.dataset.blokkliEditableActive = undefined
  }
  selection.editableActive.value = false
}

watch(modelValue, (newText) => {
  if (props.element && selection.editableActive.value) {
    const el = getElement()
    if (editableType.value === 'plaintext') {
      el.textContent = newText
    } else {
      el.innerHTML = newText
    }
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

const onAnimationFrame = () => {
  if (!root.value || ui.isMobile.value) {
    return
  }
  const rect = root.value.getBoundingClientRect()
  const top = rect.top - scrollHeight.value - 150
  offsetY.value = Math.abs(Math.min(top, 0))
}

onMounted(() => {
  eventBus.on('editable:save', onEditableSave)

  const el = getElement()

  if (isMarkup.value) {
    modelValue.value = el.innerHTML
  } else {
    modelValue.value = el.textContent || ''
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
    eventBus.on('animationFrame', onAnimationFrame)
  })
})

onBeforeUnmount(() => {
  const el = getElement()
  el.dataset.blokkliEditableActive = undefined
  eventBus.off('editable:save', onEditableSave)
  eventBus.off('animationFrame', onAnimationFrame)
})
</script>