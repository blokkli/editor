<template>
  <div class="grid grid-cols-1 grid-rows-1">
    <div class="col-start-1 row-start-1">
      <button
        type="button"
        class="flex items-center text-xs font-medium gap-5 py-8 px-8 w-full hover:bg-mono-100 text-mono-500 border border-mono-200 rounded hover:border-mono-400 cursor-text!"
        @click="open"
      >
        <Icon name="bk_mdi_reply" class="size-15" />
        {{ $t('reply', 'Reply') }}
      </button>
    </div>
    <div v-if="isOpen" class="col-start-1 row-start-1 relative z-50">
      <CommentInput
        :id="`comment_reply_${rootUuid}`"
        :initial-value="draft"
        cancellable
        :submit-label="$t('reply', 'Reply')"
        boxed
        @change="draft = $event"
        @submit="onSubmit"
        @cancel="onCancel"
      />
    </div>
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
