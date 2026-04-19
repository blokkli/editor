<template>
  <PluginSidebar
    id="agent"
    :title="agentName"
    :tooltip-title
    :tour-text="
      $t('aiAgentTourText', 'Chat with an AI assistant to edit page content.')
    "
    icon="stars"
    weight="-900"
    render-always
    beta
    region="right-bottom"
    @toggle="closeAgentPopup"
  >
    <template #icon>
      <Icon name="stars" class="bk-is-animated" />
    </template>
    <template #default="{ isShown, shouldRender }">
      <AgentContainer
        v-if="shouldRender"
        :is-shown
        :agent-name
        :adapter
        :pending-prompt-request="pendingPromptRequest"
        @consumed="pendingPromptRequest = null"
      />
    </template>
  </PluginSidebar>

  <Teleport :to="ui.mainLayoutElement.value">
    <Popup
      id="agent"
      ref="popup"
      :title="$t('aiAgentPopupTitle', 'AI-Assistant')"
      :cta="$t('aiAgentIntroPopupCta', 'Get started')"
      theme="primary"
      position="bottom-right"
      @submit="openAgent"
    >
      <Icon name="stars" class="bk-is-animated" />
      <p v-html="popupText" />
    </Popup>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  defineBlokkliFeature,
  computed,
  shallowRef,
  useTemplateRef,
  defineAsyncComponent,
} from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'
import { Icon, Popup } from '#blokkli/editor/components'
import { agentPrompts, agentName } from '#blokkli-build/agent-prompts'
import { defineItemDropdownAction } from '#blokkli/editor/composables'
import type { ItemDropdownAction } from '#blokkli/editor/providers/plugin'
import type { AgentPromptDefinition } from '#blokkli/agent/app/types'
import type { PendingPromptRequest } from './types'

const AgentContainer = defineAsyncComponent(() => import('./Container.vue'))

const { adapter } = defineBlokkliFeature({
  id: 'agent',
  icon: 'stars',
  label: 'AI Agent',
  description: 'Chat with an AI assistant to edit page content.',
  requiredPermissions: ['use_agent'],
  requiredAdapterMethods: [
    'updateFieldValue',
    'addNewBlock',
    'deleteBlocks',
    'moveMultipleBlocks',
  ],
})

const app = useBlokkli()
const { $t, ui } = app

const popup = useTemplateRef('popup')

const pendingPromptRequest = shallowRef<PendingPromptRequest | null>(null)

function closeAgentPopup() {
  if (popup.value) {
    popup.value.closePopup()
  }
}

function openAgent() {
  app.eventBus.emit('sidebar:open', 'agent')
}

const popupText = computed(() => {
  return $t(
    'aiAgentIntroPopup',
    'Need help editing? @name is your AI assistant — it can add, move, and update blocks and much more. Give it a try!',
  ).replace('@name', `<em>${agentName}</em>`)
})

const tooltipTitle = computed(() => {
  return $t('agentSidebarTooltipLabel', '@name (AI-Assistant)').replace(
    '@name',
    agentName,
  )
})

defineItemDropdownAction(() => {
  return agentPrompts.flatMap((promptFactory) => {
    const promptsResult =
      '__factory' in promptFactory ? promptFactory.resolve(app) : promptFactory
    const prompts = Array.isArray(promptsResult)
      ? promptsResult
      : [promptsResult]
    return prompts.map<ItemDropdownAction>((prompt: AgentPromptDefinition) => {
      return {
        id: 'agent:prompt:' + prompt.id,
        label: prompt.getLabel(app),
        icon: 'stars',
        group: 'agent',
        variant: 'agent',
        weight: -900,
        callback: () => {
          // Open the sidebar (which triggers the container to mount on first
          // click) and queue the prompt. The container picks it up via its
          // `immediate: true` watcher — either on mount or on change.
          app.eventBus.emit('sidebar:open', 'agent')
          pendingPromptRequest.value = {
            prompt,
            selectedUuids: [...app.selection.uuids.value],
          }
        },
      }
    })
  })
})
</script>

<script lang="ts">
export default {
  name: 'Agent',
}
</script>
