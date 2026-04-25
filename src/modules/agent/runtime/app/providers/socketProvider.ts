import { ref, readonly, type Ref } from '#imports'
import type { ClientMessage, ServerMessage } from '#blokkli/agent/shared/types'
import { routeAgent } from '#blokkli-build/agent-client'

const PING_INTERVAL_MS = 30_000
const RECONNECT_DELAY_MS = 3_000
const MAX_RECONNECT_ATTEMPTS = 10

export type SocketLifecycleHandlers = {
  onOpen?: () => void
  onClose?: () => void
  onError?: (e: Event) => void
  onMaxReconnects?: () => void
}

export type SocketProvider = {
  isConnected: Readonly<Ref<boolean>>
  send: (msg: ClientMessage) => void
  connect: () => void
  disconnect: () => void
  setMessageHandler: (handler: (data: ServerMessage) => void) => void
  setLifecycleHandlers: (handlers: SocketLifecycleHandlers) => void
}

export default function socketProvider(): SocketProvider {
  let ws: WebSocket | null = null
  let pingInterval: number | null = null
  let reconnectTimeout: number | null = null
  let reconnectAttempts = 0

  const isConnected = ref(false)

  let messageHandler: ((data: ServerMessage) => void) | null = null
  let lifecycle: SocketLifecycleHandlers = {}

  function setMessageHandler(handler: (data: ServerMessage) => void): void {
    messageHandler = handler
  }

  function setLifecycleHandlers(handlers: SocketLifecycleHandlers): void {
    lifecycle = handlers
  }

  function send(message: ClientMessage): void {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  function detachListeners(socket: WebSocket): void {
    socket.removeEventListener('open', onWebSocketOpen)
    socket.removeEventListener('close', onWebSocketClose)
    socket.removeEventListener('error', onWebSocketError)
    socket.removeEventListener('message', onWebSocketMessage)
  }

  function clearTimers(): void {
    if (pingInterval) {
      window.clearInterval(pingInterval)
      pingInterval = null
    }
    if (reconnectTimeout) {
      window.clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
  }

  function onWebSocketOpen(): void {
    isConnected.value = true
    reconnectAttempts = 0
    pingInterval = window.setInterval(() => {
      send({ type: 'ping' })
    }, PING_INTERVAL_MS)
    lifecycle.onOpen?.()
  }

  function onWebSocketClose(): void {
    if (pingInterval) {
      window.clearInterval(pingInterval)
      pingInterval = null
    }
    isConnected.value = false
    lifecycle.onClose?.()

    reconnectAttempts++
    if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
      lifecycle.onMaxReconnects?.()
      return
    }

    reconnectTimeout = window.setTimeout(() => {
      if (!isConnected.value) connect()
    }, RECONNECT_DELAY_MS)
  }

  function onWebSocketError(error: Event): void {
    console.error('WebSocket error:', error)
    lifecycle.onError?.(error)
  }

  function onWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as ServerMessage
      messageHandler?.(data)
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  function connect(): void {
    if (
      ws &&
      (ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    if (ws) {
      detachListeners(ws)
      ws = null
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}${routeAgent}`

    ws = new WebSocket(url)
    ws.addEventListener('open', onWebSocketOpen)
    ws.addEventListener('close', onWebSocketClose)
    ws.addEventListener('error', onWebSocketError)
    ws.addEventListener('message', onWebSocketMessage)
  }

  // Detach listeners before close() so onWebSocketClose does not fire and
  // schedule a reconnect for an intentional teardown.
  function disconnect(): void {
    clearTimers()
    if (ws) {
      detachListeners(ws)
      ws.close()
      ws = null
    }
    isConnected.value = false
  }

  return {
    isConnected: readonly(isConnected),
    send,
    connect,
    disconnect,
    setMessageHandler,
    setLifecycleHandlers,
  }
}
