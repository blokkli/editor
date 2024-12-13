<template>
  <div class="bk bk-messages">
    <TransitionGroup name="bk-message">
      <Item
        v-for="(message, index) in messages"
        v-bind="message"
        :key="index"
        @close="removeMessage(index)"
      />
    </TransitionGroup>
  </div>
</template>

<script lang="ts" setup>
import { ref } from '#imports'
import type { Message } from '#blokkli/types'
import Item from './Item/index.vue'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const messages = ref<Message[]>([])

function removeMessage(index: number) {
  messages.value = messages.value.filter((_v, i) => i !== index)
}

onBlokkliEvent('message', (message) => {
  messages.value.push(message)
})
</script>

<script lang="ts">
export default {
  name: 'Messages',
}
</script>
