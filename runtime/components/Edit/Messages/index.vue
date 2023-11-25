<template>
  <Teleport to="body">
    <div class="pb pb-messages">
      <TransitionGroup name="pb-message">
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
import type { PbMessage } from '#pb/types'
import Item from './Item/index.vue'

const { eventBus } = useParagraphsBuilderStore()
const messages = ref<PbMessage[]>([])

function onMessage(message: PbMessage) {
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
