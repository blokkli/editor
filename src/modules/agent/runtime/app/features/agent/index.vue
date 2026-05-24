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

  <Teleport v-if="canManageConversations" :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <ConversationsAdminDialog
        v-if="showConversationsAdmin"
        @cancel="closeConversationsAdmin"
      />
    </BlokkliTransition>
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
import { Icon, Popup, BlokkliTransition } from '#blokkli/editor/components'
import { agentPrompts, agentName } from '#blokkli-build/agent-prompts'
import {
  defineItemDropdownAction,
  defineMenuButton,
} from '#blokkli/editor/composables'
import type { ItemDropdownAction } from '#blokkli/editor/providers/plugin'
import type { AgentPromptDefinition } from '#blokkli/agent/app/types'
import type { PendingPromptRequest } from './types'

const AgentContainer = defineAsyncComponent(() => import('./Container.vue'))
const ConversationsAdminDialog = defineAsyncComponent(
  () => import('./ConversationsAdmin/index.vue'),
)

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
const { $t, ui, permissions } = app

const canManageConversations = permissions.hasPermission(
  'manage_agent_conversations',
)

const showConversationsAdmin = computed(
  () => ui.currentDialog.value?.id === 'agentConversations',
)

function closeConversationsAdmin() {
  ui.closeDialog('agentConversations')
}

defineMenuButton(() => {
  if (!canManageConversations) return undefined
  if (!adapter.agentConversations?.queryConversations) return undefined
  return {
    id: 'agentConversations',
    title: $t('agentConversations', 'Agent conversations'),
    description: $t(
      'agentConversationsMenuDescription',
      'Browse and manage all agent conversations.',
    ),
    icon: 'bk_mdi_forum',
    secondary: true,
    callback: () =>
      ui.openDialog({ id: 'agentConversations', alignment: 'center' }),
  }
})

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

<style lang="postcss">
@keyframes bk-sparkle {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(0.6);
  }
}

.bk {
  #bk-sidebar-button-agent {
    @apply text-white;

    svg {
      @apply size-30;
      @apply translate-x-[-7%];
    }
  }

  .bk-icon-stars.bk-is-animated {
    svg path {
      animation: bk-sparkle 3s ease-in-out infinite;

      &:nth-child(1) {
        transform-origin: 19px 19px;
        animation-delay: 0.6s;
      }
      &:nth-child(2) {
        transform-origin: 9px 12px;
        animation-delay: 0s;
      }
      &:nth-child(3) {
        transform-origin: 19px 5px;
        animation-delay: 1.2s;
      }
    }
  }
}

.bk-popup.bk-is-agent {
  .bk-popup-content-text {
    .bk-icon {
      @apply float-right ml-2;
      svg {
        @apply fill-accent-600 size-60;
      }
    }
    p {
      @apply hyphens-auto;
      em {
        @apply not-italic text-accent-600 font-bold hyphens-none;
      }
    }
  }
}
</style>
