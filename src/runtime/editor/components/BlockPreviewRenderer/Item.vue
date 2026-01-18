<template>
  <div class="bk-block-preview-renderer-item">
    <ScaleToFit :width="width" :max-height="maxHeight">
      <div ref="itemEl" />
    </ScaleToFit>
  </div>
</template>

<script lang="ts" setup>
import { ref, useBlokkli, onMounted, useTemplateRef } from '#imports'
import { ScaleToFit } from '#blokkli/editor/components'

const props = withDefaults(
  defineProps<{
    uuid: string
    maxHeight?: number
  }>(),
  {
    maxHeight: 400,
  },
)

const emit = defineEmits<{
  (e: 'background-color', color: string): void
}>()

const { dom, blocks } = useBlokkli()

const itemEl = useTemplateRef('itemEl')
const width = ref(400)

onMounted(() => {
  if (!itemEl.value) {
    return
  }

  const item = blocks.getBlock(props.uuid)
  if (!item) {
    return
  }

  const element = dom.getDragElement(item)
  if (!element) {
    return
  }

  // Get the width of the original element
  width.value = element.getBoundingClientRect().width

  const markup = dom.getDropElementMarkup(item)
  itemEl.value.innerHTML = markup

  // Emit background color from first rendered item
  const computedStyle = window.getComputedStyle(element)
  let bgColor = computedStyle.backgroundColor
  if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
    let parent = element.parentElement
    while (parent) {
      const parentBg = window.getComputedStyle(parent).backgroundColor
      if (parentBg !== 'rgba(0, 0, 0, 0)' && parentBg !== 'transparent') {
        bgColor = parentBg
        break
      }
      parent = parent.parentElement
    }
  }
  emit('background-color', bgColor)
})
</script>
