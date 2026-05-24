/**
 * Transform text before sending to client or storing in conversation.
 * Replaces ß with ss for Swiss German audiences.
 */
export function transformText(text: string): string {
  return text.replace(/ß/g, 'ss')
}
