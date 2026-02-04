import { ref, readonly, type Ref } from '#imports'
import type { ClientMessage, ServerMessage } from '#blokkli/agent/shared/types'

type UseAgentWebSocketOptions = {
  onMessage: (data: ServerMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

type UseAgentWebSocketReturn = {
  isConnected: Readonly<Ref<boolean>>
  connect: () => void
  disconnect: () => void
  send: (message: ClientMessage) => void
}

export function useAgentWebSocket(
  options: UseAgentWebSocketOptions,
): UseAgentWebSocketReturn {
  let ws: WebSocket | null = null
  let reconnectTimeout: number | null = null
  const isConnected = ref(false)

  function onOpen() {
    isConnected.value = true
    options.onConnect?.()
  }

  function onClose() {
    isConnected.value = false
    options.onDisconnect?.()
    // Reconnect after delay
    reconnectTimeout = window.setTimeout(() => {
      if (!isConnected.value) {
        connect()
      }
    }, 3000)
  }

  function onError(error: Event) {
    console.error('WebSocket error:', error)
  }

  function onMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data) as ServerMessage
      options.onMessage(data)
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/api/blokkli/agent`

    ws = new WebSocket(url)
    ws.addEventListener('open', onOpen)
    ws.addEventListener('close', onClose)
    ws.addEventListener('error', onError)
    ws.addEventListener('message', onMessage)
  }

  function disconnect() {
    if (reconnectTimeout) {
      window.clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    if (ws) {
      ws.removeEventListener('open', onOpen)
      ws.removeEventListener('close', onClose)
      ws.removeEventListener('error', onError)
      ws.removeEventListener('message', onMessage)
      ws.close()
      ws = null
    }
    isConnected.value = false
  }

  function send(message: ClientMessage) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  return {
    isConnected: readonly(isConnected),
    connect,
    disconnect,
    send,
  }
}
