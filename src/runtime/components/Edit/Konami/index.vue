<template>
  <Teleport to="body">
    <Game v-if="isEnabled" />
  </Teleport>
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import Game from './Game/index.vue'
import { ref } from '#imports'

const isEnabled = ref(true)

const KONAMI_CODE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA',
]

const sequence = ref<string[]>([])

onBlokkliEvent('keyPressed', (e) => {
  const key = e.code

  // Add the key to the sequence
  sequence.value.push(key)

  // Keep only the last N keys (where N is the length of the Konami code)
  if (sequence.value.length > KONAMI_CODE.length) {
    sequence.value.shift()
  }

  // Check if the sequence matches the Konami code
  if (sequence.value.length === KONAMI_CODE.length) {
    const matches = KONAMI_CODE.every((code, index) => {
      return sequence.value[index] === code
    })

    if (matches) {
      isEnabled.value = true
      sequence.value = []
    }
  }
})
</script>
