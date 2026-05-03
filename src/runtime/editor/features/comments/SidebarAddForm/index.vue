<template>
  <SidebarFloater>
    <CommentInput
      id="comment_sidebar_add"
      v-model="draft"
      :placeholder="$t('commentAddPlaceholder', 'Add a comment…')"
      :autofocus="false"
      :submit-label="$t('commentSave', 'Submit comment')"
      @submit="onSubmit"
    />
  </SidebarFloater>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import CommentInput from '../CommentInput/index.vue'
import SidebarFloater from '#blokkli/editor/components/SidebarFloater/index.vue'

const { $t, storage } = useBlokkli()

const emit = defineEmits<{
  (e: 'submit', value: string): void
}>()

const draft = storage.useWithContextPrefix('commentSidebarAdd', '')

function onSubmit(value: string) {
  emit('submit', value)
  draft.value = ''
}
</script>

<script lang="ts">
export default {
  name: 'SidebarAddForm',
}
</script>
