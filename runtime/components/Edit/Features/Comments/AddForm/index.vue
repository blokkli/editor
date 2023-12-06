<template>
  <div class="bk-blokkli-item-actions-comment-dropdown" @keydown.capture.stop>
    <label for="comment_body" class="bk-form-label">{{
      text('commentBody')
    }}</label>
    <textarea
      v-model.lazy="comment"
      type="text"
      id="comment_body"
      class="bk-form-input"
      rows="5"
      required
    />
    <button @click="$emit('add', comment)" class="bk-button bk-is-primary">
      {{ text('commentSave') }}
    </button>
  </div>
</template>

<script lang="ts" setup>
const comment = ref('')
defineEmits(['add'])
const { text } = useBlokkli()
</script>
