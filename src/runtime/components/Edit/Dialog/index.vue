<template>
  <div
    ref="rootEl"
    class="bk bk-dialog bk-control"
    @wheel.passive.stop
    @keydown.stop="onKeyDown"
    @keyup.stop
    @touchstart.passive.stop
    @touchmove.stop
    @touchend.stop
  >
    <div class="bk-dialog-background" @click="$emit('cancel')" />
    <div class="bk-dialog-inner" :style="style">
      <div class="bk bk-overlay-header">
        <Icon v-if="icon" :name="icon" />
        <h3>{{ title }}</h3>
        <button @click="$emit('cancel')">
          <Icon name="close" />
        </button>
      </div>

      <div class="bk-dialog-content">
        <div class="bk-dialog-content-inner">
          <div v-if="lead" class="bk bk-dialog-lead">
            {{ lead }}
          </div>
          <slot />
        </div>
      </div>
      <div v-if="!hideButtons" class="bk bk-dialog-footer">
        <button
          class="bk-button"
          :disabled="!canSubmit"
          :class="[
            { 'bk-is-loading': isLoading },
            isDanger ? 'bk-is-danger' : 'bk-is-primary',
          ]"
          @click="$emit('submit')"
        >
          {{ submitLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli, onMounted, computed, ref } from '#imports'
import type { BlokkliIcon } from '#blokkli/icons'
import { Icon } from '#blokkli/components'
import { modulo } from '#blokkli/helpers'

const { ui } = useBlokkli()

const emit = defineEmits(['submit', 'cancel'])

const rootEl = ref<HTMLDivElement | null>(null)

const props = withDefaults(
  defineProps<{
    title: string
    lead?: string
    width?: number
    submitLabel?: string
    canSubmit?: boolean
    isDanger?: boolean
    isLoading?: boolean
    hideButtons?: boolean
    icon?: BlokkliIcon
  }>(),
  {
    width: 600,
    canSubmit: true,
    lead: '',
    submitLabel: '',
    icon: undefined,
  },
)

const style = computed(() => {
  if (ui.isMobile.value) {
    return {}
  }

  return {
    width: props.width + 'px',
  }
})

type FocusableElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLButtonElement
  | HTMLTextAreaElement

const getFocusableElements = (): FocusableElement[] => {
  if (!rootEl.value) {
    return []
  }
  return [
    ...rootEl.value.querySelectorAll('input,select,button,textarea'),
  ] as FocusableElement[]
}

const onKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Escape') {
    e.preventDefault()
    emit('cancel')
    return
  }
  if (!rootEl.value || e.code !== 'Tab') {
    return
  }
  const prev = e.shiftKey
  const focusableElements = getFocusableElements().filter((el) => {
    const style = window.getComputedStyle(el)
    if (style.pointerEvents === 'none') {
      return false
    }

    return !el.disabled
  }) as HTMLElement[]

  const activeIndex = Math.max(
    focusableElements.findIndex((el) => document.activeElement === el),
    0,
  )

  const delta = prev ? -1 : 1

  const indexToFocus = modulo(activeIndex + delta, focusableElements.length)
  const elementToFocus = focusableElements[indexToFocus]

  if (elementToFocus) {
    elementToFocus.focus()
    e.preventDefault()
  }
}

onMounted(() => {
  // Focus the first best match in the dialog. That is, an element that is not a button.
  const focusableElements = getFocusableElements()
  const bestMatch =
    focusableElements.find((el) => !(el instanceof HTMLButtonElement)) ||
    focusableElements[0]

  if (bestMatch) {
    bestMatch.focus()
  }
})
</script>

<script lang="ts">
export default {
  name: 'BlokkliDialog',
}
</script>
