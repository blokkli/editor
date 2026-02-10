<template>
  <div class="bk-agent-attachment">
    <button
      v-if="removable"
      :title="$t('aiAgentRemoveAttachment', 'Remove attachment')"
      class="bk-agent-attachment-close"
      @click="$emit('remove')"
    >
      <Icon name="bk_mdi_close" />
    </button>
    <button
      class="bk-agent-attachment-text"
      :title="$t('aiAgentViewAttachment', 'View attachment')"
      @click="showAttachment = true"
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
        class="bk-agent-attachment-modal"
        @cancel="showAttachment = false"
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
