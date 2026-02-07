import type { Peer, Message } from 'crossws'
import { defineWebSocketHandler, useRuntimeConfig } from '#imports'
import type { ClientMessage, ServerMessage } from '../shared/types'
import { SessionManager } from './SessionManager'
import { DEBUG_LOGGING } from './helpers'

function send(peer: Peer, message: ServerMessage): void {
  peer.send(JSON.stringify(message))
}

const sessionManager = new SessionManager()
const peers = new Map<string, Peer>()

sessionManager.startPruning((peerId) => {
  const peer = peers.get(peerId)
  if (peer) {
    peer.close()
    peers.delete(peerId)
  }
})

export default defineWebSocketHandler({
  open(peer: Peer) {
    if (DEBUG_LOGGING) {
      console.log(`\n[WebSocket] Client connected: ${peer.id}`)
    }
    peers.set(peer.id, peer)
  },

  async message(peer: Peer, message: Message) {
    try {
      const data = JSON.parse(message.text()) as ClientMessage

      if (DEBUG_LOGGING && data.type !== 'ping') {
        console.log(`\n[WebSocket] Message from ${peer.id}:`, data.type)
      }

      // Handle authentication before any other message.
      if (data.type === 'authenticate') {
        const config = useRuntimeConfig()
        const authSecret = config.blokkli?.agent?.authSecret
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

      switch (data.type) {
        case 'init':
          session.init(data.tools, data.pageContext)
          break

        case 'start':
          session.start(peer, data.prompt, data.selectedUuids)
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
          session.acceptChanges(peer)
          break

        case 'reject':
          session.rejectChanges(peer)
          break

        case 'get_transcript':
          session.getTranscript(peer)
          break

        case 'new_conversation':
          session.newConversation(peer)
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
    if (DEBUG_LOGGING) {
      console.log(`\n[WebSocket] Client disconnected: ${peer.id}`)
    }
    sessionManager.cleanup(peer.id)
    peers.delete(peer.id)
  },

  error(peer: Peer, error: Error) {
    console.error(`[WebSocket] Error for ${peer.id}:`, error)
    sessionManager.cleanup(peer.id)
    peers.delete(peer.id)
  },
})
