<template>
  <div class="bk-blokkli-item-actions-comment-dropdown" @keydown.capture.stop>
    <label for="comment_body" class="bk-form-label">{{
      text('commentBody')
    }}</label>
    <textarea
      id="comment_body"
      v-model.lazy="comment"
      type="text"
      class="bk-form-input"
      rows="5"
      required
    />
    <button class="bk-button bk-is-primary" @click="$emit('add', comment)">
      {{ text('commentSave') }}
    </button>
  </div>
</template>

<script lang="ts" setup>
const comment = ref('')
defineEmits(['add'])
const { text } = useBlokkli()
</script>
