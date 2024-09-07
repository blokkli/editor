<template>
  <button
    class="bk-message"
    :class="[{ 'bk-has-timer': hasTimer }, 'bk-is-' + type]"
    @click="$emit('close')"
    @mouseenter="stopTimer"
    @mouseleave="startTimer"
  >
    <p>{{ message }}</p>
    <p v-if="additionalText" class="bk-message-additional">
      {{ additionalText }}
    </p>
  </button>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, computed } from '#imports'

const props = defineProps<{
  type: 'success' | 'error'
  message: string
  additional?: string | Error | unknown
}>()

const emit = defineEmits(['close'])
const hasTimer = ref(true)

const additionalText = computed(() => {
  if (!props.additional) {
    return null
  }

  if (props.additional instanceof Error) {
    return props.additional.message
  }

  return null
})

function stopTimer() {
  clearTimeout(timeout)
  hasTimer.value = false
}

function startTimer() {
  clearTimeout(timeout)
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
