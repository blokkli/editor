<template>
  <div
    class="bk-message"
    :class="[{ 'bk-has-timer': hasTimer }, 'bk-is-' + type]"
    data-test="message"
    @mouseenter="stopTimer"
    @mouseleave="startTimer"
  >
    <button
      class="bk-message-content"
      data-test="message-close"
      @click="$emit('close')"
    >
      <p data-test="message-text">{{ message }}</p>
      <p
        v-if="additionalText"
        class="bk-message-additional"
        data-test="message-additional"
      >
        {{ additionalText }}
      </p>
    </button>

    <div
      v-if="additional && additional instanceof Error"
      class="bk-message-actions"
    >
      <button
        class="bk-button bk-scheme-red"
        data-test="message-details"
        @click.prevent="showDetails = true"
      >
        <Icon name="bk_mdi_bug_report" />
        Details
      </button>
    </div>
    <Teleport
      v-if="additional && additional instanceof Error && showDetails"
      :to="ui.mainLayoutElement.value"
    >
      <DialogModal
        id="messages-error-details"
        title="Error Details"
        hide-buttons
        width="100%"
        @cancel="showDetails = false"
      >
        <div class="bk bk-message-error">
          <code>
            <div v-text="additional.message" />
            <div v-text="additional.name" />
            <div v-text="additional.cause" />
            <div v-text="additional.stack" />
          </code>
        </div>
      </DialogModal>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  onMounted,
  onBeforeUnmount,
  computed,
  watch,
  useBlokkli,
} from '#imports'
import { Icon, DialogModal } from '#blokkli/editor/components'

const props = defineProps<{
  type: 'success' | 'error' | 'warning'
  message: string
  additional?: string | Error | unknown
}>()

const { ui } = useBlokkli()

const emit = defineEmits(['close'])
const hasTimer = ref(true)
const showDetails = ref(false)

const additionalText = computed(() => {
  if (!props.additional) {
    return null
  }

  if (props.additional instanceof Error) {
    return props.additional.message
  }

  // A text is shown as it is. Only an error has details to look into.
  if (typeof props.additional === 'string') {
    return props.additional
  }

  return null
})

watch(showDetails, function (isVisible) {
  if (isVisible) {
    stopTimer()
  }
})

function stopTimer() {
  clearTimeout(timeout)
  hasTimer.value = false
}

function startTimer() {
  clearTimeout(timeout)
  if (showDetails.value) {
    return
  }
  hasTimer.value = true
  timeout = setTimeout(() => {
    emit('close')
  }, 6000)
}

let timeout: any = null

onMounted(() => {
  startTimer()
})

onBeforeUnmount(() => {
  stopTimer()
})
</script>
