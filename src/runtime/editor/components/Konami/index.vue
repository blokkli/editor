<template>
  <Teleport to="body">
    <BlokkliTransition name="slide-up">
      <Game v-if="isEnabled" @close="isEnabled = false" />
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, ref } from '#imports'
import { BlokkliTransition } from '#blokkli/editor/components'
import { onBlokkliEvent } from '#blokkli/editor/composables'

const Game = defineAsyncComponent(() => import('./Game/index.vue'))

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
