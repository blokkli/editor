import { getUploadType } from '#blokkli/editor/helpers/uploads'
import { isSafeUrl } from '#blokkli/editor/helpers/url'
import type { UploadType } from '#blokkli/editor/types/uploads'
import type {
  ClipboardFileGroup,
  ClipboardMapBundleEventFile,
  ClipboardMapBundleEventImage,
  ClipboardMapBundleEventPlaintext,
} from './types'

/**
 * Clean the pasted markup in the container: remove its images and line breaks,
 * and every attribute but the `href` of a link to a web page or an email
 * address.
 *
 * It's what's pasted, not what's shown: the drop preview sanitises it.
 */
export function cleanPastedHtml(container: Element) {
  for (const el of [...container.querySelectorAll('*')]) {
    if (el.tagName === 'IMG' || el.tagName === 'BR') {
      el.remove()
      continue
    }
    for (const attribute of [...el.attributes]) {
      if (
        el.tagName !== 'A' ||
        attribute.name !== 'href' ||
        !isSafeUrl(attribute.value)
      ) {
        el.removeAttributeNode(attribute)
      }
    }
  }
}

/**
 * Build the ClipboardMapBundleEvent of a file.
 */
export function buildFileMapEvent(
  file: File,
): ClipboardMapBundleEventImage | ClipboardMapBundleEventFile {
  return {
    type: getUploadType(file.type),
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
        type: getUploadType(item.type),
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
  files: Array<{ type: UploadType; bundles: string[] }>,
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
