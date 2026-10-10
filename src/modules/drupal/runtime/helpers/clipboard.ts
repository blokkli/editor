/**
 * Whether Drupal accepts a file for a media type's source field, as far as the
 * file is known: its extension is allowed, and it isn't too large. While a file
 * is dragged, its name is unknown and its size 0, and neither is checked. A
 * field without extensions allows any, one with a maximum size of 0 any size.
 */
export function isFileAccepted(
  file: { fileName?: string; fileSize: number },
  field: { fileExtensions: string[]; maxFileSize: number },
): boolean {
  if (field.maxFileSize > 0 && file.fileSize > field.maxFileSize) {
    return false
  }

  // Drupal compares the end of the name, ignoring case, so an extension can
  // have a dot, as "tar.gz" does.
  const extensions = field.fileExtensions.filter(Boolean)
  if (!file.fileName || !extensions.length) {
    return true
  }
  const name = file.fileName.toLowerCase()
  return extensions.some((extension) =>
    name.endsWith('.' + extension.toLowerCase()),
  )
}
