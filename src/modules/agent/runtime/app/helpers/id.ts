/**
 * Generate a short, unique-enough id for client-side conversation items and
 * tool calls. Not cryptographic — use `generateUUID` for anything persisted as
 * a stable identity.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
