import { ref, type Ref } from '#imports'
import type { ClientPlanState } from '#blokkli/agent/shared/types'
import type { SocketProvider } from './socketProvider'
import type { ConversationProvider } from './conversationProvider'

export type PlanProvider = {
  plan: Ref<ClientPlanState | null>
  approve: () => void
  reject: () => void
  applyUpdate: (state: ClientPlanState | null) => void
  clear: () => void
}

export default function planProvider({
  socket,
  conversation,
}: {
  socket: SocketProvider
  conversation: ConversationProvider
}): PlanProvider {
  const plan = ref<ClientPlanState | null>(null)

  function approve(): void {
    socket.send({ type: 'plan_approve' })
  }

  function reject(): void {
    socket.send({ type: 'plan_reject' })
  }

  function applyUpdate(state: ClientPlanState | null): void {
    if (
      state &&
      state.steps.length > 0 &&
      state.steps.every((s) => s.status === 'completed')
    ) {
      conversation.pushServerTool({
        tool: 'plan_completed',
        label: state.title,
      })
      plan.value = null
      return
    }
    plan.value = state
  }

  function clear(): void {
    plan.value = null
  }

  return {
    plan,
    approve,
    reject,
    applyUpdate,
    clear,
  }
}
