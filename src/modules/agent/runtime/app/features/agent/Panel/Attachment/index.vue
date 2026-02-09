<template>
  <div class="bk-agent-attachment">
    <button
      v-if="removable"
      :title="$t('aiAgentRemoveAttachment', 'Remove attachment')"
      @click="$emit('remove')"
      class="bk-agent-attachment-close"
    >
      <Icon name="bk_mdi_close" />
    </button>
    <button
      class="bk-agent-attachment-text"
      @click="showAttachment = true"
      :title="$t('aiAgentViewAttachment', 'View attachment')"
    >
      <div>
        <span class="bk-agent-attachment-title">{{ title }}</span>
        <span class="bk-agent-attachment-preview">{{ preview }}</span>
      </div>
    </button>
  </div>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <DialogModal
        v-if="showAttachment"
        :id="'attachment-modal-' + attachment.id"
        :title
        :width="1200"
        hide-buttons
        @cancel="showAttachment = false"
        class="bk-agent-attachment-modal"
      >
        <div>{{ attachment.content }}</div>
      </DialogModal>
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, ref } from '#imports'
import {
  Icon,
  BlokkliTransition,
  DialogModal,
} from '#blokkli/editor/components'
import type { Attachment } from '#blokkli/agent/app/types'

const props = defineProps<{
  attachment: Attachment
  removable?: boolean
}>()

defineEmits<{
  remove: []
}>()

const { $t, ui } = useBlokkli()

const showAttachment = ref(false)

const title = computed(() => {
  if (props.attachment.type === 'text') {
    return $t('aiAgentPastedText', 'Pasted text')
  }
  return ''
})

const preview = computed(() => {
  return props.attachment.content.replace(/\s+/g, ' ').trim().slice(0, 200)
})
</script>
