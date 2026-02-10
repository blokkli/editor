import type { Peer, Message } from 'crossws'
import { defineWebSocketHandler, useRuntimeConfig } from '#imports'
import { clientMessageSchema } from '../shared/types'
import { SessionManager } from './SessionManager'
import { send } from './helpers'

const sessionManager = new SessionManager()

const config = useRuntimeConfig()
const authSecret = config.blokkli?.agent?.authSecret || ''
const apiKey = config.blokkli?.agent?.apiKey || ''

export default defineWebSocketHandler({
  open(_peer: Peer) {},

  async message(peer: Peer, message: Message) {
    try {
      const parsed = clientMessageSchema.safeParse(JSON.parse(message.text()))
      if (!parsed.success) {
        send(peer, {
          type: 'error',
          errorType: 'bad_request',
          message: 'Invalid message format',
        })
        return
      }
      const data = parsed.data

      // Handle authentication before any other message.
      if (data.type === 'authenticate') {
        if (
          !authSecret ||
          !sessionManager.authenticate(data.authToken, authSecret)
        ) {
          send(peer, {
            type: 'error',
            errorType: 'unauthorized',
            message: 'Authentication required.',
          })
          peer.close()
          return
        }
        // Cleanup existing session if re-authenticating.
        if (sessionManager.get(peer.id)) {
          sessionManager.cleanup(peer.id)
        }
        sessionManager.create(peer.id)
        send(peer, { type: 'authenticated' })
        return
      }

      // Reject all other messages if no session exists (not authenticated).
      const session = sessionManager.get(peer.id)
      if (!session) {
        send(peer, {
          type: 'error',
          errorType: 'unauthorized',
          message: 'Authentication required.',
        })
        peer.close()
        return
      }

      // Update activity timestamp for idle timeout.
      sessionManager.touch(peer.id)

      if (data.type === 'ping') {
        return
      }

      // Reject state-mutating messages while the agent is processing.
      if (session.isProcessing) {
        switch (data.type) {
          case 'init':
          case 'accept':
          case 'reject':
          case 'new_conversation':
          case 'restore_conversation':
            send(peer, {
              type: 'error',
              errorType: 'bad_request',
              message:
                'Cannot perform this action while the agent is processing.',
            })
            return
        }
      }

      switch (data.type) {
        case 'init':
          session.init(data.tools, data.pageContext)
          break

        case 'start':
          if (!apiKey) {
            send(peer, {
              type: 'error',
              errorType: 'authentication',
              message: 'API key not configured',
            })
            return
          }
          session.start(
            peer,
            data.prompt,
            apiKey,
            authSecret,
            data.selectedUuids,
            data.pageStructure,
          )
          break

        case 'tool_result':
          session.resolveToolResult(data.callId, {
            result: data.result,
            error: data.error,
          })
          break

        case 'cancel':
          session.cancel(peer)
          break

        case 'accept':
          session.acceptChanges(peer, authSecret)
          break

        case 'reject':
          session.rejectChanges(peer, authSecret)
          break

        case 'get_transcript':
          session.getTranscript(peer)
          break

        case 'new_conversation':
          session.newConversation(peer, authSecret)
          break

        case 'restore_conversation': {
          const result = session.restoreConversation(data.state, authSecret)
          if (result.success) {
            send(peer, { type: 'conversation_restored' })
          } else {
            send(peer, {
              type: 'conversation_restore_failed',
              reason: result.reason || 'Unknown error',
            })
          }
          break
        }

        case 'plan_approve':
          session.approvePlan()
          break

        case 'plan_reject':
          session.rejectPlan()
          break
      }
    } catch (error) {
      console.error('WebSocket message error:', error)
      send(peer, {
        type: 'error',
        errorType: 'unknown',
        message: 'Failed to process message',
        detail: error instanceof Error ? error.message : undefined,
      })
    }
  },

  close(peer: Peer) {
    sessionManager.cleanup(peer.id)
  },

  error(peer: Peer, error: Error) {
    console.error(`[WebSocket] Error for ${peer.id}:`, error)
    sessionManager.cleanup(peer.id)
  },
})
