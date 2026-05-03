<template>
  <SidebarFloater>
    <button
      v-if="!isOpen"
      type="button"
      class="bk-button w-full bk-scheme-yellow"
      @click="open"
    >
      <Icon name="bk_mdi_add_comment" class="size-18" />
      <span class="font-semibold">{{
        $t('commentAddPlaceholder', 'Add new comment...')
      }}</span>
    </button>
    <CommentInput
      v-else
      id="comment_sidebar_add"
      :initial-value="draft"
      cancellable
      :submit-label="$t('commentSave', 'Submit comment')"
      @change="draft = $event"
      @submit="onSubmit"
      @cancel="onCancel"
    />
  </SidebarFloater>
</template>

<script lang="ts" setup>
import { ref, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import CommentInput from '../../CommentInput/index.vue'
import SidebarFloater from '#blokkli/editor/components/SidebarFloater/index.vue'

const { $t, storage } = useBlokkli()

const emit = defineEmits<{
  (e: 'submit', value: string): void
}>()

const draft = storage.useWithContextPrefix('commentSidebarAdd', '')

const isOpen = ref(draft.value.trim().length > 0)

function open() {
  isOpen.value = true
}

function onCancel() {
  draft.value = ''
  isOpen.value = false
}

function onSubmit(value: string) {
  emit('submit', value)
  draft.value = ''
  isOpen.value = false
}
</script>

<script lang="ts">
export default {
  name: 'SidebarAddForm',
}
</script>
