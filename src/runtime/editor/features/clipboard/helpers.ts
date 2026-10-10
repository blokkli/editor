import type {
  ClipboardFileGroup,
  ClipboardMapBundleEventFile,
  ClipboardMapBundleEventImage,
  ClipboardMapBundleEventPlaintext,
  ClipboardUploadType,
} from './types'

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
 * Whether a file of the MIME type is mapped and added as an image or a file.
 */
export function getFileType(mimeType: string): ClipboardUploadType {
  return mimeType.startsWith('image/') ? 'image' : 'file'
}

/**
 * Build the ClipboardMapBundleEvent of a file.
 */
export function buildFileMapEvent(
  file: File,
): ClipboardMapBundleEventImage | ClipboardMapBundleEventFile {
  return {
    type: getFileType(file.type),
    fileType: file.type,
    fileSize: file.size,
    fileName: file.name,
  }
}

/**
 * Build the ClipboardMapBundleEvents of the drag event's dataTransfer items:
 * one per file, or one for text. Returns an empty array if we can't determine
 * a suitable mapping event.
 */
export function buildMapBundleEvents(
  e: DragEvent,
): Array<
  | ClipboardMapBundleEventImage
  | ClipboardMapBundleEventFile
  | ClipboardMapBundleEventPlaintext
> {
  const dt = e.dataTransfer
  if (!dt || !dt.items || dt.items.length === 0) {
    return []
  }

  // Check for file items first.
  const fileItems = Array.from(dt.items).filter((item) => item.kind === 'file')
  if (fileItems.length) {
    return fileItems.map((item) => {
      // Try to get file metadata. Browsers may restrict this during
      // dragenter/dragover, in which case getAsFile() returns null.
      const file = item.getAsFile()
      return {
        type: getFileType(item.type),
        fileType: item.type,
        fileSize: file?.size || 0,
        fileName: file?.name,
      }
    })
  }

  // Text drags may have multiple items (text/plain + text/html).
  // As long as there are no files, treat it as plaintext.
  if (dt.items[0]?.kind === 'string') {
    return [{ type: 'plaintext', text: '' }]
  }

  return []
}

/**
 * Group files by type, each group with the bundles all its files can have. A
 * group without any can't be added.
 */
export function groupFileBundles(
  files: Array<{ type: ClipboardUploadType; bundles: string[] }>,
): ClipboardFileGroup[] {
  const groups: ClipboardFileGroup[] = []
  for (const { type, bundles } of files) {
    const group = groups.find((v) => v.type === type)
    if (group) {
      group.bundles = group.bundles.filter((bundle) => bundles.includes(bundle))
    } else {
      groups.push({ type, bundles: [...bundles] })
    }
  }
  return groups
}

/**
 * Narrow the groups to the bundles that can be added, such as those a field
 * allows. Returns null if a group has none left.
 */
export function narrowFileGroups(
  groups: ClipboardFileGroup[],
  canAddBundle: (bundle: string) => boolean,
): ClipboardFileGroup[] | null {
  const narrowed = groups.map((group) => ({
    type: group.type,
    bundles: group.bundles.filter(canAddBundle),
  }))
  return narrowed.every((group) => group.bundles.length) ? narrowed : null
}
