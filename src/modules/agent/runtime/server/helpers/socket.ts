import type { Peer } from 'crossws'
import type { ServerMessage } from '../../shared/types'

/** Serialize and send a server message to a connected WebSocket peer. */
export function send(peer: Peer, message: ServerMessage): void {
  peer.send(JSON.stringify(message))
}
