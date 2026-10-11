import type { PluginConfigInput } from './pluginConfig'

/**
 * How a file is uploaded: as an image or as a file.
 */
export type UploadType = 'image' | 'file'

/**
 * What's known of a file to upload: all of it once the file is picked or
 * dropped, only its MIME type while it's dragged, and only the upload type when
 * asking whether such files can be uploaded at all.
 */
export type UploadFileInfo = {
  type: UploadType
  /**
   * The file's MIME type.
   */
  fileType?: string
  /**
   * The file's size in bytes.
   */
  fileSize?: number
  fileName?: string
}

export type UploadFileEvent = {
  file: File
  type: UploadType
  /**
   * Called with the share of the file uploaded, from 0 to 1.
   */
  onProgress: (progress: number) => void
  /**
   * Aborts the upload.
   */
  signal: AbortSignal
}

/**
 * An uploaded file, from which a media is created. Or, if a media with the same
 * file exists, that media, which is used as it is.
 */
export type UploadFileResult =
  | { fileId: string }
  | { media: { id: string; label: string } }

/**
 * A file uploaded to create a media from.
 */
export type UploadedFile = {
  type: UploadType
  fileId: string
}

/**
 * The form of the media created from an uploaded file.
 */
export type UploadForm = {
  /**
   * The form's fields.
   */
  inputs: PluginConfigInput[]
  /**
   * Whether the fields are all the form needs: if not, a required field can't
   * be filled in, and no media can be created.
   */
  complete: boolean
}

export type CreateMediaFromUploadsItem = {
  upload: UploadedFile
  /**
   * The values of the form's fields, keyed by their names.
   */
  values: Record<string, unknown>
}

export type CreateMediaFromUploadsResult = {
  /**
   * The ID of the media created, or null.
   */
  mediaId: string | null
  /**
   * The errors, each with the name of its field, or null.
   */
  errors: { name: string | null; message: string }[]
}

/**
 * The media of an uploaded file: created, or existing with the same file.
 */
export type UploadedMedia = {
  type: UploadType
  mediaId: string
}
