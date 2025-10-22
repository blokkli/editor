<template>
  <div class="bk-comment-textarea">
    <textarea
      id="comment_body"
      ref="textarea"
      v-model="value"
      type="text"
      class="bk-form-input"
      rows="4"
      :placeholder
      required
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef } from '#imports'

defineProps<{
  id: string
  placeholder?: string
}>()

const value = defineModel<string>()

const el = useTemplateRef('textarea')

onMounted(() => {
  if (el.value) {
    el.value.focus()
  }
})
</script>
