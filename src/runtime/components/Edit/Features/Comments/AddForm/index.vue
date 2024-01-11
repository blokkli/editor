<template>
  <div class="bk-blokkli-item-actions-comment-dropdown" @keydown.capture.stop>
    <label for="comment_body" class="bk-form-label">{{
      $t('commentBody', 'Comment')
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
      {{ $t('commentSave', 'Submit comment') }}
    </button>
  </div>
</template>

<script lang="ts" setup>
import { ref, useBlokkli } from '#imports'

const comment = ref('')
defineEmits(['add'])
const { $t } = useBlokkli()
</script>
