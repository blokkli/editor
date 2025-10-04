<template>
  <button
    ref="button"
    class="bk-selection-add-button bk-is-field"
    tabindex="-1"
    :style="{
      transform: `translate(${left}px, ${top}px)`,
      visibility: isVisible ? 'visible' : 'hidden',
    }"
    @click="onClick"
  >
    <div>
      <Icon name="plus" />
    </div>
  </button>
</template>

<script setup lang="ts">
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { useBlokkli, ref, useTemplateRef } from '#imports'
import { Icon } from '#blokkli/components'

const props = defineProps<{
  fieldKey: string | undefined
  containerRect: { x: number; y: number } | null
}>()

const emit = defineEmits<{
  click: [element: HTMLElement]
}>()

const { dom } = useBlokkli()

const button = useTemplateRef('button')

const left = ref(0)
const top = ref(0)
const isVisible = ref(false)

const BUTTON_SIZE = 30

function onClick() {
  if (button.value) {
    emit('click', button.value)
  }
}

onBlokkliEvent('canvas:draw', () => {
  if (!props.fieldKey || !props.containerRect) {
    isVisible.value = false
    return
  }

  const fieldRect = dom.getFieldRect(props.fieldKey)
  if (!fieldRect) {
    isVisible.value = false
    return
  }

  left.value = Math.round(fieldRect.x + fieldRect.width / 2 - BUTTON_SIZE / 2)
  top.value = Math.round(fieldRect.y + fieldRect.height / 2 - BUTTON_SIZE / 2)
  isVisible.value = true
})
</script>
