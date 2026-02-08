import { createStorage, type Storage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs'

const storage = createStorage({
  driver: fsDriver({ base: './storage/agent-conversations' }),
})

export function useAgentConversationStorage(): Storage {
  return storage
}

export function conversationKey(
  entityType: string,
  entityUuid: string,
  id: string,
): string {
  return `${entityType}:${entityUuid}:${id}`
}

export function conversationPrefix(
  entityType: string,
  entityUuid: string,
): string {
  return `${entityType}:${entityUuid}:`
}
