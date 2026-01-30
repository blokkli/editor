<template>
  <div v-if="messages.length" class="bk-rewrite-messages">
    <div
      v-for="(message, index) in messages"
      :key="index"
      class="bk-rewrite-message"
      :class="{
        'bk-is-user': message.role === 'user',
        'bk-is-assistant': message.role === 'assistant',
      }"
    >
      <Icon :name="message.role === 'user' ? 'bk_mdi_person' : 'stars'" />
      <div class="bk-rewrite-message-content">
        <span>{{ message.content }}</span>
        <ul
          v-if="message.acceptedTexts && message.acceptedTexts.length"
          class="bk-rewrite-accepted-texts"
        >
          <li v-for="(item, i) in message.acceptedTexts" :key="i">
            {{ item.text }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#blokkli/editor/components'
import type { RewriteMessage } from '../types'

defineProps<{
  messages: RewriteMessage[]
}>()
</script>
