import type { ClipboardMapBundleEvent } from './types'

export type NativeDragMapResult = ClipboardMapBundleEvent & {
  fileName?: string
  fileCount?: number
}

const ALLOWED_HTML_ATTRIBUTES = ['href']

function removeAllAttrs(element: Element) {
  for (let i = element.attributes.length; i-- > 0; ) {
    const attribute = element.attributes[i]!
    if (!ALLOWED_HTML_ATTRIBUTES.includes(attribute.name)) {
      element.removeAttributeNode(attribute)
    }
  }
}

/**
 * Recursively remove all attributes (except allowed ones) from an element
 * and its children. Removes IMG and BR elements entirely.
 */
export function sanitizeHtml(el: Element) {
  if (el.tagName === 'IMG' || el.tagName === 'BR') {
    el.remove()
    return
  }
  const children = el.children
  for (let i = 0; i < children.length; i++) {
    const child = children[i]!
    removeAllAttrs(child)
    if (child.children.length) {
      sanitizeHtml(child)
    }
  }
}

/**
 * Build a ClipboardMapBundleEvent from the drag event's dataTransfer items.
 * Returns null if we can't determine a suitable mapping event.
 */
export function buildMapBundleEvent(e: DragEvent): NativeDragMapResult | null {
  const dt = e.dataTransfer
  if (!dt || !dt.items || dt.items.length === 0) {
    return null
  }

  // Check for file items first.
  let fileCount = 0
  let fileItem: DataTransferItem | null = null
  for (let i = 0; i < dt.items.length; i++) {
    const item = dt.items[i]
    if (item?.kind === 'file') {
      fileCount++
      fileItem = item
    }
  }

  if (fileItem) {
    // Try to get file metadata. Browsers may restrict this during
    // dragenter/dragover, in which case getAsFile() returns null.
    const file = fileItem.getAsFile()
    const fileSize = file?.size || 0
    if (fileItem.type.startsWith('image/')) {
      return {
        type: 'image',
        fileType: fileItem.type,
        fileSize,
        fileName: file?.name,
        fileCount,
      }
    }
    return {
      type: 'file',
      fileType: fileItem.type,
      fileSize,
      fileName: file?.name,
      fileCount,
    }
  }

  // Text drags may have multiple items (text/plain + text/html).
  // As long as there are no files, treat it as plaintext.
  if (dt.items.length > 0 && dt.items[0]?.kind === 'string') {
    return { type: 'plaintext', text: '' }
  }

  return null
}
