<template>
  <div class="bk-agent-assistant-bubble bk-is-tool bk-is-server-tool">
    <div class="bk-agent-tool-call bk-is-server-tool">
      <Icon
        :name="getServerSideToolIcon(tool)"
        class="bk-agent-tool-call-status"
      />
      <span>{{ serverToolLabel }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import type { ServerToolConversationItem } from '#blokkli/agent/app/types'
import type { BlokkliIcon } from '#blokkli-build/icons'

const props = defineProps<ServerToolConversationItem>()

const { $t } = useBlokkli()

const serverToolLabel = computed(() => {
  if (props.tool === 'load_skill') {
    return $t('aiAgentLoadSkill', 'Using skill "@label"').replace(
      '@label',
      props.label,
    )
  }
  if (props.tool === 'load_tools') {
    return $t('aiAgentLoadTools', '@count tools loaded').replace(
      '@count',
      props.label,
    )
  }
  return props.label
})

function getServerSideToolIcon(
  id: ServerToolConversationItem['tool'],
): BlokkliIcon {
  if (id === 'load_skill') {
    return 'bk_mdi_book_2'
  }

  return 'bk_mdi_build-fill'
}
</script>
