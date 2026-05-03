<template>
  <div>
    <button
      v-if="!isOpen"
      type="button"
      class="flex items-center text-xs font-medium gap-5 py-8 px-8 w-full hover:bg-mono-100 text-mono-500 border border-mono-200 rounded hover:border-mono-300"
      @click="open"
    >
      <Icon name="bk_mdi_reply" class="size-15" />
      {{ $t('commentReply', 'Reply') }}
    </button>
    <CommentInput
      v-else
      :id="`comment_reply_${rootUuid}`"
      :initial-value="draft"
      cancellable
      :submit-label="$t('commentReply', 'Reply')"
      boxed
      @change="draft = $event"
      @submit="onSubmit"
      @cancel="onCancel"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import CommentInput from '../../CommentInput/index.vue'

const { $t, storage } = useBlokkli()

const props = defineProps<{
  rootUuid: string
}>()

const emit = defineEmits<{
  (e: 'submit', value: string): void
}>()

const draft = storage.useWithContextPrefix('commentReply_' + props.rootUuid, '')

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
  name: 'CommentReplyForm',
}
</script>
