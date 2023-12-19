<template>
  <Teleport to=".bk-main-canvas">
    <Transition name="bk-editable">
      <div
        v-if="selection.editableActive.value"
        :style="style"
        class="bk bk-editable-field bk-control"
      >
        <form @submit.prevent="cancel" class="bk-editable-field-input">
          <div class="bk-editable-field-buttons">
            <h3>
              <ItemIcon :bundle="itemBundle" />
              {{ label }}
            </h3>
            <button type="submit">
              <span>{{ translationText('cancel') }}</span>
              <Icon name="close" />
            </button>
          </div>

          <div class="bk-editable-field-textarea">
            <textarea
              ref="input"
              enterkeyhint="done"
              v-model="text"
              @keydown.stop.capture="onKeyDown"
              rows="2"
              :style="inputStyle"
              v-bind="inputAttributes"
              @blur="onBlur"
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
        </form>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import type {
  DraggableExistingBlokkliItem,
  EditableFieldFocusEvent,
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

const {
  eventBus,
  ui,
  selection,
  state,
  adapter,
  text: translationText,
  types,
} = useBlokkli()

const label = ref('')
const fieldName = ref('')
const input = ref<HTMLInputElement | null>(null)
const style = ref<Record<string, any> | null>(null)
const originalText = ref('')
const text = ref('')
const itemBundle = ref('')
const element = ref<HTMLElement | null>(null)
const inputStyle = ref<Record<string, any>>({})
const required = ref(false)
const maxlength = ref(0)
const block = ref<DraggableExistingBlokkliItem | null>(null)
let blurTimeout: any = null

const onBlur = (e: FocusEvent) => {
  clearTimeout(blurTimeout)

  if (!ui.isMobile.value) {
    return
  }

  e.stopPropagation()
  e.preventDefault()

  blurTimeout = setTimeout(() => {
    if (!selection.editableActive.value) {
      return
    }
    close(true)
  }, 100)
}

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
    return translationText('fieldIsRequired')
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
  if (ui.isMobile.value) {
    style.value = {}
  } else {
    const artboardEl = ui.artboardElement()
    const artboardRect = artboardEl.getBoundingClientRect()
    const artboardScroll = artboardEl.scrollTop
    const scale = ui.getArtboardScale()
    const rect = e.element.getBoundingClientRect()
    const x = (rect.x - artboardRect.x) / scale
    const y = (rect.y - artboardRect.y) / scale + artboardScroll
    style.value = {
      width: e.element.offsetWidth + 'px',
      top: y + 'px',
      left: x + 'px',
    }
  }
  const typeLabel = types.getType(e.block.itemBundle)?.label || ''
  const fieldLabel = e.args?.label || e.fieldName
  label.value = [typeLabel, fieldLabel].join(' » ')
  block.value = e.block
  text.value = e.element.textContent || ''
  originalText.value = e.element.textContent || ''
  element.value = e.element
  itemBundle.value = e.block.itemBundle
  selection.editableActive.value = true
  maxlength.value = e.args?.maxlength || 0
  required.value = !!e.args?.required

  const computedStyle = window.getComputedStyle(e.element)
  inputStyle.value = {
    textAlign: computedStyle.textAlign,
  }

  nextTick(() => {
    if (input.value) {
      input.value.focus()
      inputStyle.value.minHeight =
        Math.min(input.value.scrollHeight, 100) + 'px'
    }
  })
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

  if (save && block.value && text.value !== originalText.value) {
    await state.mutateWithLoadingState(
      adapter.updateFieldValue({
        uuid: block.value.uuid,
        fieldName: fieldName.value,
        fieldValue: text.value,
      }),
    )
  }
  if (!save && element.value) {
    element.value.textContent = originalText.value
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
