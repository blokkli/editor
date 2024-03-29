<template>
  <Teleport to="body">
    <div v-show="isVisible" class="bk">
      <div class="bk-edit-indicator" :style="style">
        <button
          ref="button"
          class="bk-button bk-is-primary"
          @mouseenter="isHovering = true"
          @mouseleave="isHovering = false"
          @click="$emit('edit')"
        >
          {{ label }}
        </button>
      </div>

      <div
        v-if="overlayStyle"
        :style="overlayStyle"
        class="bk-edit-indicator-overlay"
      />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import textProvider from '#blokkli/helpers/textProvider'
import { ref, computed } from '#imports'
import '#blokkli/theme'
import '#blokkli/styles'
import useAnimationFrame from '#blokkli/helpers/composables/useAnimationFrame'

const props = defineProps<{
  uuid: string
  editLabel?: string
}>()

const $t = textProvider()

const label = computed(
  () => props.editLabel || $t('editIndicatorLabel', 'Edit blocks'),
)

defineEmits(['edit'])

const isHovering = ref(false)

const style = ref<Record<string, string>>({})
const button = ref<HTMLButtonElement | null>(null)
const isVisible = ref(false)

const overlayStyle = ref<Record<string, string> | null>(null)

function calculateIdealYPosition(elementHeight: number, bounds: DOMRect) {
  const idealTop = Math.min(
    Math.max(bounds.top, bounds.bottom - elementHeight - 20),
    20,
  )

  return Math.max(idealTop, bounds.y + 20)
}

useAnimationFrame(() => {
  const el = document.querySelector(`[data-provider-uuid="${props.uuid}"]`)
  isVisible.value = window.innerWidth > 1024
  if (isVisible.value && el && el instanceof HTMLElement && button.value) {
    const rect = el.getBoundingClientRect()
    const buttonHeight = button.value.getBoundingClientRect().height
    const y = calculateIdealYPosition(buttonHeight, rect)
    style.value.transform = `translateY(${y}px)`

    if (isHovering.value) {
      overlayStyle.value = {
        width: rect.width + 'px',
        height: rect.height + 'px',
        transform: `translate(${rect.x}px, ${rect.y}px)`,
      }
    } else {
      overlayStyle.value = null
    }
  }
})
</script>

<style lang="postcss"></style>
