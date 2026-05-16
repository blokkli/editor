<template>
  <div class="relative max-w-full min-w-0">
    <button
      v-if="removable"
      :title="$t('aiAgentRemoveAttachment', 'Remove attachment')"
      class="absolute -top-5 -right-5 bg-white border border-mono-300 size-20 flex items-center justify-center shrink-0 cursor-pointer rounded-full text-mono-700 hover:bg-red-normal hover:text-white hover:border-red-normal"
      @click="$emit('remove')"
    >
      <Icon name="bk_mdi_close" class="size-15" />
    </button>
    <button
      :title="$t('aiAgentViewAttachment', 'View attachment')"
      class="p-10 text-xs rounded border w-full text-left"
      :class="{
        'bg-accent-50 border-accent-300 text-accent-700/70 hover:bg-accent-100 hover:border-accent-400':
          !inverted,
        'bg-accent-800 border-accent-500 text-white/70 hover:bg-accent-900 hover:border-accent-400':
          inverted,
      }"
      @click="showAttachment = true"
    >
      <div class="line-clamp-4">
        <span
          class="font-semibold mb-2 uppercase tracking-wider block"
          :class="inverted ? 'text-white' : 'text-accent-800'"
        >
          {{ title }}
        </span>
        <span class="break-all">{{ preview }}</span>
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
        flush
        @cancel="showAttachment = false"
      >
        <div class="p-10 whitespace-pre-wrap select-text">
          <component :is="previewComponent" :content="bodyContent" />
        </div>
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
  inverted?: boolean
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
