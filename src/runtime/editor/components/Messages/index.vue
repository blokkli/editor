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
import type { Message } from '#blokkli/editor/types/ui'

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

onBlokkliEvent('message:clear', () => {
  messages.value = []
})
</script>

<script lang="ts">
export default {
  name: 'Messages',
}
</script>

<style lang="postcss">
@keyframes bk-message-timer {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

.bk.bk-messages {
  @apply overflow-hidden absolute left-0 w-full z-messages bottom-0 pointer-events-auto;
  .bk-message {
    @apply relative flex items-center flex-col md:flex-row;

    &.bk-has-timer {
      &:before {
        content: '';
        @apply h-5 bg-white/50 absolute bottom-0 left-0 w-full origin-top-left;
        animation: 6.1s bk-message-timer linear;
      }
    }

    &.bk-is-success {
      @apply bg-lime-normal;

      .bk-message-content {
        @apply text-white;
      }
    }
    &.bk-is-error {
      @apply bg-red-normal;

      .bk-message-content {
        @apply text-white;
      }
    }

    &.bk-is-warning {
      @apply bg-yellow-normal;

      .bk-message-content {
        @apply text-yellow-dark;
      }
    }
  }
  .bk-message-content {
    @apply p-20 font-bold text-lg text-center relative flex-1 lg:text-2xl;
    @apply hover:bg-red-dark/15;
  }
  .bk-message-additional {
    @apply text-base font-normal lg:text-xl;
  }
  .bk-message-actions {
    @apply p-10;
    button {
      @apply border-red-light/60 border hover:border-red-dark;
    }
  }
}

.bk.bk-message-error {
  @apply bg-mono-100 p-20 select-text;
}
</style>
