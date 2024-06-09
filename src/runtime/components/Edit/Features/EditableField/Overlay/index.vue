<template>
  <div
    v-if="loaded"
    ref="root"
    :style="style"
    class="bk-editable-field bk-control"
  >
    <form ref="form" class="bk-editable-field-input" @submit.prevent="close">
      <div class="bk bk-editable-field-buttons">
        <h3>
          <ItemIcon :bundle="itemBundle" />
          <span>{{ title }}</span>
        </h3>
        <button @click.prevent="cancel">
          <Icon name="close" />
          <span>{{ $t('cancel', 'Cancel') }}</span>
        </button>
        <button :disabled="!hasChanged" type="submit" @click.prevent="save">
          <Icon name="save" />
          <span>{{ $t('save', 'Save') }}</span>
        </button>
      </div>

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

      <div v-if="!isMarkup" class="bk bk-editable-field-info">
        <div v-if="errorText" class="bk-editable-field-info-error">
          {{ errorText }}
        </div>
        <div class="bk-editable-field-info-count">
          <span>{{ count }}</span>
          <span v-if="maxlength >= 1">&nbsp;/&nbsp;{{ maxlength }}</span>
        </div>
      </div>
    </form>
  </div>
</template>

<script lang="ts" setup>
import type {
  DraggableExistingBlock,
  EntityContext,
  EditableFieldConfig,
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
import { falsy, findIdealRectPosition } from '#blokkli/helpers'
import InputPlaintext from './Plaintext/index.vue'
import InputContenteditable from './Contenteditable/index.vue'
import InputFrame from './Frame/index.vue'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const { eventBus, ui, selection, state, adapter, $t, types } = useBlokkli()

const props = defineProps<{
  fieldName: string
  host: DraggableExistingBlock | EntityContext
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

const getElement = (): HTMLElement => props.element

type Alignment = 'left' | 'center' | 'right'

const alignment = computed<Alignment>(() => {
  if (props.element) {
    const style = window.getComputedStyle(props.element)
    if (
      style.textAlign === 'left' ||
      style.textAlign === 'center' ||
      style.textAlign === 'right'
    ) {
      return style.textAlign
    } else if (style.textAlign === 'start') {
      return 'left'
    } else if (style.textAlign === 'end') {
      return 'right'
    }
  }
  return 'center'
})

const scrollHeight = ref(0)
const loaded = ref(false)
const originalText = ref(props.value || '')
const modelValue = ref('')
const width = ref(320)
const inputStyle = ref<Record<string, any>>({})
const form = ref<HTMLFormElement | null>(null)
const root = ref<HTMLDivElement | null>(null)
const input = ref<HTMLDivElement | null>(null)

const x = ref(0)
const y = ref(0)

const style = computed(() => {
  if (ui.isMobile.value) {
    return {}
  } else {
    return {
      width: width.value + 'px',
      top: y.value + 'px',
      left: x.value + 'px',
    }
  }
})

const hasChanged = computed(() => modelValue.value !== originalText.value)
const itemBundle = computed(() => {
  if ('itemBundle' in props.host) {
    return props.host.itemBundle
  }
})
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
      await state.mutateWithLoadingState(
        adapter.updateFieldValue!({
          uuid: props.host.uuid,
          fieldName: props.fieldName,
          fieldValue: modelValue.value,
        }),
      )
    } else if (adapter.updateEntityFieldValue) {
      await state.mutateWithLoadingState(
        adapter.updateEntityFieldValue({
          fieldName: props.fieldName,
          fieldValue: modelValue.value,
        }),
      )
    }
  }
  if (!shouldSave.value && el) {
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
    return
  }
}

const onAnimationFrame = () => {
  if (ui.isMobile.value) {
    return
  }
  const elementRect = props.element.getBoundingClientRect()

  const height = form.value?.scrollHeight || 100
  const newWidth = Math.min(Math.max(elementRect.width, 360), 1000)

  const ideal = findIdealRectPosition(
    ui.viewportBlockingRects.value,
    {
      x:
        alignment.value === 'left'
          ? elementRect.x
          : elementRect.x + (Math.max(elementRect.width, 360) - newWidth) / 2,
      y: elementRect.y - height - 20,
      height,
      width: newWidth,
    },
    ui.visibleViewportPadded.value,
  )

  x.value = ideal.x
  y.value = ideal.y + height
  width.value = newWidth
}

onAnimationFrame()

onBlokkliEvent('animationFrame', onAnimationFrame)

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
