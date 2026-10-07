/**
 * The id of a heading, for links from the table of contents: "Gebühren" becomes
 * "gebuhren". Undefined when nothing is left.
 */
export function anchorId(text?: string | null): string | undefined {
  const id = (text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return id || undefined
}
