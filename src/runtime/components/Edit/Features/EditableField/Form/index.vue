<template>
  <Teleport to=".bk-main-canvas">
    <div @click.capture.stop :style="style" class="bk bk-editable-field">
      <div class="bk-editable-field-input">
        <div class="bk-editable-field-buttons">
          <button>
            <Icon name="close" />
            <span>Abbrechen</span>
          </button>
        </div>
        <div class="bk-editable-field-textarea">
          <textarea
            ref="input"
            v-model="text"
            @keydown.stop="onKeyDown"
            @wheel.stop.prevent.capture
            rows="2"
            :style="inputStyle"
          />
          <div :style="inputStyle" class="bk-textarea" v-html="text" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, useBlokkli, nextTick } from '#imports'

const props = defineProps<{
  fieldName: string
  element: HTMLElement
}>()

const { ui } = useBlokkli()

const input = ref<HTMLInputElement | null>(null)
const isVisible = ref(false)
const style = ref<Record<string, any> | null>(null)
const originalText = ref('')
const text = ref('')

const inputStyle = ref<Record<string, any>>({})

const onKeyDown = (e: KeyboardEvent) => {
  console.log(e)
  if (e.code === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.code === 'Enter') {
    e.preventDefault()
    close()
  }
}

const close = () => {
  isVisible.value = false
  style.value = null
  text.value = ''
  originalText.value = ''
}

watch(text, (newText) => {
  props.element.innerText = newText || '   '
})

onMounted(() => {
  const artboardRect = ui.artboardElement().getBoundingClientRect()
  const scale = ui.getArtboardScale()
  const rect = props.element.getBoundingClientRect()
  const x = (rect.x - artboardRect.x) / scale
  const y = (rect.y - artboardRect.y) / scale
  style.value = {
    width: rect.width + 'px',
    top: y + 'px',
    left: x + 'px',
  }
  text.value = props.element.textContent || ''
  originalText.value = props.element.textContent || ''
  isVisible.value = true

  const computedStyle = window.getComputedStyle(props.element)
  inputStyle.value = {
    textAlign: computedStyle.textAlign,
  }

  nextTick(() => {
    if (input.value) {
      input.value.focus()
    }
  })
})
</script>
