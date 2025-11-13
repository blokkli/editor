<template>
  <slot />
</template>

<script lang="ts" setup>
import { emitMessage } from '#blokkli/helpers/eventBus'
import { ref, onErrorCaptured, useBlokkli } from '#imports'
import { useGlobalBlokkliObject } from '#blokkli/helpers/composables/useGlobalBlokkliObject'

const props = defineProps<{
  label: string
}>()

const { $t } = useBlokkli()
const globalBlokkli = useGlobalBlokkliObject()

const errors = ref<Error[]>([])

const isLocked = defineModel<boolean>({ default: false })

const emit = defineEmits<{
  (e: 'error', error: Error): void
}>()

onErrorCaptured((err) => {
  errors.value.push(err)
  if (import.meta.dev) {
    console.error(err)
  }
  emit('error', err)

  // Log error to global messages
  globalBlokkli.pushMessage({
    type: 'error',
    name: 'ErrorBoundary',
    date: new Date().toISOString(),
    message: `[${props.label}] ${err.message}`,
    context: err.stack || '',
  })

  const willBeLocked = errors.value.length >= 3
  if (willBeLocked) {
    const message = $t(
      'errorCapturedMessageDisabled',
      '"@label" has errored more than 3 times. The feature will be disabled.',
    )
      .replace('@label', props.label)
      .replace('@errorMessage', err.message)
    emitMessage(message, 'error', true)
  } else {
    const message = $t(
      'errorCapturedMessage',
      'Error in "@label": @errorMessage',
    )
      .replace('@label', props.label)
      .replace('@errorMessage', err.message)
    emitMessage(message, 'warning')
  }

  isLocked.value = willBeLocked
  return false
})
</script>
