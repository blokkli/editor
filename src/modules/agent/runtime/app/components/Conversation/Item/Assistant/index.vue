<template>
  <div
    class="bk-agent-message bk-is-assistant bk-agent-assistant-bubble"
    data-test="agent-assistant-message"
  >
    <Markdown class="bk-agent-message-text" :content="renderedContent" />
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import Markdown from '#blokkli/agent/app/components/Markdown/index.vue'
import { linkifyBlockUuids } from '#blokkli/agent/app/helpers/linkifyBlockUuids'
import { PLACEHOLDER_USER_NAME } from '#blokkli/agent/shared/placeholders'

const props = defineProps<{
  id: string
  timestamp: number
  type: 'assistant'
  content: string
}>()

const { $t, state, blocks, types } = useBlokkli()

const renderedContent = computed(() => {
  const withName = props.content.replaceAll(
    PLACEHOLDER_USER_NAME,
    state.owner.value?.name || '',
  )
  return linkifyBlockUuids(
    withName,
    (uuid) => {
      const block = blocks.getBlock(uuid)
      return block ? types.getBlockLabel(block.bundle) : null
    },
    $t('deleted', 'deleted'),
  )
})
</script>
