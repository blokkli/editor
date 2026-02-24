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
        <component :is="previewComponent" :content="bodyContent" />
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
import PreviewMarkdown from './PreviewMarkdown/index.vue'
import PreviewHtml from './PreviewHtml/index.vue'
import PreviewCode from './PreviewCode/index.vue'
import PreviewCsv from './PreviewCsv/index.vue'

const PREVIEW_COMPONENTS = {
  markdown: PreviewMarkdown,
  html: PreviewHtml,
  code: PreviewCode,
  csv: PreviewCsv,
  plaintext: PreviewCode,
} as const

const props = defineProps<{
  attachment: Attachment
  removable?: boolean
}>()

defineEmits<{
  remove: []
}>()

const { $t, ui } = useBlokkli()

const showAttachment = ref(false)

const FILE_PREFIX = '--- File: '

const title = computed(() => {
  if (props.attachment.type === 'text') {
    const content = props.attachment.content
    if (content.startsWith(FILE_PREFIX)) {
      const endIndex = content.indexOf(' ---\n')
      if (endIndex !== -1) {
        return content.slice(FILE_PREFIX.length, endIndex)
      }
    }
    return $t('aiAgentPastedText', 'Pasted text')
  }
  return ''
})

const bodyContent = computed(() => {
  const content = props.attachment.content
  const headerEnd = content.indexOf(' ---\n')
  if (content.startsWith(FILE_PREFIX) && headerEnd !== -1) {
    return content.slice(headerEnd + 5)
  }
  return content
})

const previewComponent = computed(() => {
  return PREVIEW_COMPONENTS[props.attachment.format]
})

const preview = computed(() => {
  return props.attachment.content.replace(/\s+/g, ' ').trim().slice(0, 200)
})
</script>
