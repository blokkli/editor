<template>
  <Teleport to=".bk-main-canvas">
    <Transition name="bk-editable">
      <div
        v-if="selection.editableActive.value"
        :style="style"
        class="bk bk-editable-field bk-control"
      >
        <div class="bk-editable-field-input">
          <div class="bk-editable-field-buttons">
            <h3>{{ fieldLabel }}</h3>
            <button @click.capture.stop="cancel">
              <span>Abbrechen</span>
              <Icon name="close" />
            </button>
          </div>

          <div class="bk-editable-field-textarea">
            <textarea
              ref="input"
              v-model="text"
              @keydown.stop="onKeyDown"
              rows="2"
              :style="inputStyle"
              v-bind="inputAttributes"
            />
            <div :style="inputStyle" class="bk-textarea" v-html="text" />
          </div>
          <div class="bk-editable-field-info">
            <div v-if="errorText" class="bk-editable-field-info-error">
              {{ errorText }}
            </div>
            <div class="bk-editable-field-info-count">
              <span>{{ count }}</span>
              <span v-if="maxlength">&nbsp;/&nbsp;{{ maxlength }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import type {
  DraggableExistingBlokkliItem,
  EditableFieldFocusEvent,
} from '#blokkli/types'
import { Icon } from '#blokkli/components'
import {
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  useBlokkli,
  nextTick,
} from '#imports'

const { eventBus, ui, selection, state, adapter } = useBlokkli()

const fieldLabel = ref('')
const fieldName = ref('')
const input = ref<HTMLInputElement | null>(null)
const style = ref<Record<string, any> | null>(null)
const originalText = ref('')
const text = ref('')
const element = ref<HTMLElement | null>(null)
const inputStyle = ref<Record<string, any>>({})
const required = ref(false)
const maxlength = ref(0)
const block = ref<DraggableExistingBlokkliItem | null>(null)

const inputAttributes = computed(() => {
  const attrs: Record<string, any> = {}
  if (required.value) {
    attrs.required = true
  }
  if (maxlength.value) {
    attrs.maxlength = maxlength.value
  }
  return attrs
})

const count = computed(() => text.value.length)

const errorText = computed(() => {
  if (required.value && !text.value) {
    return 'This field is required'
  }
})

const cancel = () => {
  close(false)
}

const onKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Escape') {
    e.preventDefault()
    close(false)
  } else if (e.code === 'Enter') {
    e.preventDefault()
    close(true)
  }
}

const onEditableFocus = (e: EditableFieldFocusEvent) => {
  const artboardRect = ui.artboardElement().getBoundingClientRect()
  const scale = ui.getArtboardScale()
  const rect = e.element.getBoundingClientRect()
  const x = (rect.x - artboardRect.x) / scale
  const y = (rect.y - artboardRect.y) / scale
  style.value = {
    width: rect.width + 'px',
    top: y + 'px',
    left: x + 'px',
  }
  fieldName.value = e.fieldName
  block.value = e.block
  text.value = e.element.textContent || ''
  originalText.value = e.element.textContent || ''
  element.value = e.element
  selection.editableActive.value = true
  fieldLabel.value = e.args?.label || e.fieldName
  maxlength.value = e.args?.maxlength || 0
  required.value = !!e.args?.required

  const computedStyle = window.getComputedStyle(e.element)
  inputStyle.value = {
    textAlign: computedStyle.textAlign,
  }

  nextTick(() => {
    if (input.value) {
      input.value.focus()
      inputStyle.value.minHeight = input.value.scrollHeight + 'px'
    }
  })
}

const close = async (save?: boolean) => {
  if (save && errorText.value) {
    return
  }
  if (!save && element.value) {
    element.value.textContent = originalText.value
  }
  if (save && block.value && text.value !== originalText.value) {
    await state.mutateWithLoadingState(
      adapter.updateFieldValue({
        uuid: block.value.uuid,
        fieldName: fieldName.value,
        fieldValue: text.value,
      }),
    )
  }
  selection.editableActive.value = false
  style.value = null
  text.value = ''
  originalText.value = ''
  required.value = false
  maxlength.value = 0
}

watch(text, (newText) => {
  if (element.value && selection.editableActive.value) {
    element.value.innerText = newText || ' '
  }
})

const onEditableSave = () => {
  if (selection.editableActive.value) {
    close(true)
  }
}

onMounted(() => {
  eventBus.on('editable:focus', onEditableFocus)
  eventBus.on('editable:save', onEditableSave)
})

onBeforeUnmount(() => {
  eventBus.off('editable:focus', onEditableFocus)
  eventBus.off('editable:save', onEditableSave)
})
</script>
