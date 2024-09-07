<template>
  <div
    class="bk-message"
    :class="[{ 'bk-has-timer': hasTimer }, 'bk-is-' + type]"
    @mouseenter="stopTimer"
    @mouseleave="startTimer"
  >
    <button class="bk-message-content" @click="$emit('close')">
      <p>{{ message }}</p>
      <p v-if="additionalText" class="bk-message-additional">
        {{ additionalText }}
      </p>
    </button>

    <div
      v-if="additional && additional instanceof Error"
      class="bk-message-actions"
    >
      <button
        class="bk-button bk-is-danger"
        @click.prevent="showDetails = true"
      >
        <Icon name="bug" />
        Details
      </button>
    </div>
    <Teleport
      v-if="additional && additional instanceof Error && showDetails"
      to="body"
    >
      <DialogModal
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
import { ref, onMounted, onBeforeUnmount, computed, watch } from '#imports'
import { Icon, DialogModal } from '#blokkli/components'

const props = defineProps<{
  type: 'success' | 'error'
  message: string
  additional?: string | Error | unknown
}>()

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
