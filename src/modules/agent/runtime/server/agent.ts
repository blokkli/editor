import type { Peer, Message } from 'crossws'
import { defineWebSocketHandler } from '#imports'
import type { ClientMessage, ServerMessage } from '../shared/types'
import { sessionManager } from './SessionManager'
import { DEBUG_LOGGING } from './helpers'

function send(peer: Peer, message: ServerMessage): void {
  peer.send(JSON.stringify(message))
}

export default defineWebSocketHandler({
  open(peer: Peer) {
    if (DEBUG_LOGGING) {
      console.log(`\n[WebSocket] Client connected: ${peer.id}`)
    }
    sessionManager.getOrCreate(peer.id)
  },

  async message(peer: Peer, message: Message) {
    try {
      const data = JSON.parse(message.text()) as ClientMessage
      const session = sessionManager.getOrCreate(peer.id)

      if (DEBUG_LOGGING) {
        console.log(`\n[WebSocket] Message from ${peer.id}:`, data.type)
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
  },

  error(peer: Peer, error: Error) {
    console.error(`[WebSocket] Error for ${peer.id}:`, error)
    sessionManager.cleanup(peer.id)
  },
})
