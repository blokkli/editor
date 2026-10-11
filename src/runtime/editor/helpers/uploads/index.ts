import type { UploadFileInfo, UploadType } from '#blokkli/editor/types/uploads'

/**
 * Whether a file of the MIME type is uploaded as an image or as a file.
 */
export function getUploadType(mimeType: string): UploadType {
  return mimeType.startsWith('image/') ? 'image' : 'file'
}

/**
 * What's known of a picked or dropped file.
 */
export function getUploadFileInfo(file: File): UploadFileInfo {
  return {
    type: getUploadType(file.type),
    fileType: file.type,
    fileSize: file.size,
    fileName: file.name,
  }
}
