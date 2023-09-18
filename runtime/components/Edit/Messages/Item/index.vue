<template>
  <button
    class="pb-message"
    :class="[{ 'pb-has-timer': hasTimer }, 'pb-is-' + type]"
    @click="$emit('close')"
    @mouseenter="stopTimer"
    @mouseleave="startTimer"
  >
    {{ message }}
  </button>
</template>

<script lang="ts" setup>
defineProps<{
  type: 'success' | 'error'
  message: string
}>()

const emit = defineEmits(['close'])
const hasTimer = ref(true)

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
