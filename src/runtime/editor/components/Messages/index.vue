<template>
  <div class="bk bk-messages">
    <TransitionGroup :name="ui.useAnimations.value ? 'bk-message' : undefined">
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
import { ref, useBlokkli } from '#imports'
import Item from './Item/index.vue'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import type { Message } from '#blokkli/editor/types/ui';

const { ui } = useBlokkli()

const messages = ref<Message[]>([
  // {
  //   type: 'success',
  //   message: 'Foobar this is just a message',
  // },
])

function removeMessage(index: number) {
  messages.value = messages.value.filter((_v, i) => i !== index)
}

onBlokkliEvent('message', (message) => {
  if (message.replace) {
    messages.value = [message]
  } else {
    messages.value.push(message)
  }
})
</script>

<script lang="ts">
export default {
  name: 'Messages',
}
</script>
