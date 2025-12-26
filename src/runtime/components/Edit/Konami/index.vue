<template>
  <BlokkliTransition name="slide-up">
    <Game v-if="isEnabled" @close="isEnabled = false" />
  </BlokkliTransition>
</template>

<script lang="ts" setup>
import Game from './Game/index.vue'
import { ref } from '#imports'
import { BlokkliTransition } from '#blokkli/components'
import { onBlokkliEvent } from '#blokkli/editor/composables'

const isEnabled = ref(false)

const KONAMI_CODE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
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
