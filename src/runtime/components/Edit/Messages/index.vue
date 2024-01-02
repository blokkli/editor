<template>
  <Teleport to="body">
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
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, useBlokkli, onMounted, onUnmounted } from '#imports'
import type { Message } from '#blokkli/types'
import Item from './Item/index.vue'

const { eventBus } = useBlokkli()
const messages = ref<Message[]>([])

function onMessage(message: Message) {
  messages.value.push(message)
}

function removeMessage(index: number) {
  messages.value = messages.value.filter((_v, i) => i !== index)
}

onMounted(() => {
  eventBus.on('message', onMessage)
})

onUnmounted(() => {
  eventBus.off('message', onMessage)
})
</script>

<script lang="ts">
export default {
  name: 'Messages',
}
</script>
