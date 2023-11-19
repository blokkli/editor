<template>
  <div class="pb-paragraph-actions-comment-dropdown">
    <label for="comment_body" class="pb-form-label">Kommentar</label>
    <textarea
      v-model.lazy="comment"
      type="text"
      id="comment_body"
      class="pb-form-input"
      rows="5"
      required
    />
    <button @click="emit('add', comment)" class="pb-button pb-is-primary">
      Kommentar speichern
    </button>
  </div>
</template>

<script lang="ts" setup>
const comment = ref('')
defineEmits(['add'])
</script>
