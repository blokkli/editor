<template>
  <div class="bk-agent-input">
    <FlexTextarea
      ref="textarea"
      v-model="model"
      :max-height="150"
      submit-on-enter
      paste-markdown
      rows="2"
      :placeholder="placeholder"
      @submit="onSubmit"
    />
    <div class="bk-agent-input-actions">
      <div>
        <div ref="menuContainer">
          <button
            class="bk-agent-more-btn"
            :title="$t('aiAgentMoreOptions', 'More options')"
            @click="showMenu = !showMenu"
          >
            <Icon name="bk_mdi_more_horiz" />
          </button>
          <div v-if="showMenu" class="bk-agent-more-dropdown">
            <button @click="onNewConversation">
              <Icon name="bk_mdi_add" />
              <span>{{
                $t('aiAgentNewConversation', 'Start new conversation')
              }}</span>
            </button>
            <button @click="onShowConversations">
              <Icon name="bk_mdi_history" />
              <span>{{
                $t('aiAgentPastConversations', 'Past conversations')
              }}</span>
            </button>
            <hr />
            <button @click="onShowTranscript">
              <Icon name="bk_mdi_bug_report" />
              <span>{{
                $t('aiAgentShowTranscript', 'Show transcript...')
              }}</span>
            </button>
          </div>
        </div>
      </div>
      <div class="bk-agent-input-actions-right">
        <button
          v-if="isProcessing"
          class="bk-agent-cancel-btn"
          @click="$emit('cancel')"
        >
          <Icon name="bk_mdi_stop" />
        </button>
        <button
          v-else
          class="bk-agent-submit-btn"
          :disabled="!canSubmit"
          @click="onSubmit"
        >
          <Icon name="bk_mdi_arrow_upward" />
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  useTemplateRef,
  useBlokkli,
} from '#imports'
import { Icon, FlexTextarea } from '#blokkli/editor/components'

const props = defineProps<{
  placeholder: string
  isProcessing: boolean
}>()

const emit = defineEmits<{
  (
    e:
      | 'submit'
      | 'cancel'
      | 'new-conversation'
      | 'show-transcript'
      | 'show-conversations',
  ): void
}>()

const { $t, eventBus } = useBlokkli()

const model = defineModel<string>({ required: true })
const textarea = useTemplateRef('textarea')
const menuContainer = useTemplateRef('menuContainer')
const showMenu = ref(false)

function closeMenu() {
  showMenu.value = false
}

function onDocumentClick(e: MouseEvent) {
  if (!menuContainer.value?.contains(e.target as Node)) {
    closeMenu()
  }
}

eventBus.on('mouse:up', closeMenu)

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  eventBus.off('mouse:up', closeMenu)
})

const canSubmit = computed(() => {
  return model.value.trim().length > 0 && !props.isProcessing
})

function onSubmit() {
  if (!canSubmit.value) return
  emit('submit')
}

function onNewConversation() {
  showMenu.value = false
  emit('new-conversation')
}

function onShowConversations() {
  showMenu.value = false
  emit('show-conversations')
}

function onShowTranscript() {
  showMenu.value = false
  emit('show-transcript')
}

function focus() {
  textarea.value?.focus()
}

defineExpose({ focus })
</script>
