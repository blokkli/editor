import { computed, markRaw, reactive } from '#imports'
import type { BlokkliAdapter } from '#blokkli/editor/adapter'
import type { PluginConfigInput } from '#blokkli/editor/types/pluginConfig'
import type {
  ClipboardUpload,
  ClipboardUploadForm,
  ClipboardUploadType,
} from '../types'
import { getFileType } from '../helpers'

export type UploadStatus = 'queued' | 'uploading' | 'uploaded' | 'failed'

/**
 * A file of the upload dialog, from its upload to its media.
 */
export type UploadItem = {
  /**
   * The file's position among the files given.
   */
  id: number
  file: File
  type: ClipboardUploadType
  status: UploadStatus
  /**
   * The share of the file uploaded, from 0 to 1.
   */
  progress: number
  /**
   * Why the upload failed, if the adapter said so.
   */
  error: string | null
  /**
   * The uploaded file, from which a media is created.
   */
  upload: ClipboardUpload | null
  /**
   * The form of the media created from the uploaded file.
   */
  form: ClipboardUploadForm | null
  /**
   * The values of the form's fields, keyed by their names.
   */
  values: Record<string, unknown>
  /**
   * The errors of the form's fields, keyed by their names.
   */
  errors: Record<string, string>
  /**
   * The errors that belong to no field.
   */
  messages: string[]
  /**
   * The ID of the media: created, or existing with the same file.
   */
  mediaId: string | null
  /**
   * The label of the existing media with the same file.
   */
  duplicate: string | null
}

export type UploadMethods = Required<
  Pick<
    BlokkliAdapter<unknown>,
    'uploadFile' | 'getUploadForm' | 'createMediaFromUploads'
  >
>

/**
 * Whether a field has a value, if it needs one.
 */
function isFilled(input: PluginConfigInput, value: unknown): boolean {
  if (!input.required) {
    return true
  }
  if (input.type === 'checkbox') {
    return value === true
  }
  return typeof value === 'string' && value.trim() !== ''
}

/**
 * Uploads files, a few at a time, and creates their media.
 */
export function createUploads(
  files: File[],
  adapter: UploadMethods,
  concurrency = 2,
) {
  const items = reactive<UploadItem[]>(
    files.map((file, id) => ({
      id,
      file: markRaw(file),
      type: getFileType(file.type),
      status: 'queued',
      progress: 0,
      error: null,
      upload: null,
      form: null,
      values: {},
      errors: {},
      messages: [],
      mediaId: null,
      duplicate: null,
    })),
  )
  const controllers = new Set<AbortController>()

  /**
   * Whether there are files, each uploaded and its media can be created: its
   * form's required fields are filled in.
   */
  const isReady = computed(
    () =>
      items.length > 0 &&
      items.every(
        (item) =>
          item.status === 'uploaded' &&
          (item.mediaId !== null ||
            (!!item.form?.complete &&
              item.form.inputs.every((input) =>
                isFilled(input, item.values[input.name]),
              ))),
      ),
  )

  /**
   * Start the queued uploads, as many as may run.
   */
  function start() {
    const running = items.filter((item) => item.status === 'uploading').length
    items
      .filter((item) => item.status === 'queued')
      .slice(0, Math.max(concurrency - running, 0))
      .forEach(upload)
  }

  async function upload(item: UploadItem) {
    const controller = new AbortController()
    controllers.add(controller)
    item.status = 'uploading'
    item.progress = 0
    item.error = null
    try {
      const result = await adapter.uploadFile({
        file: item.file,
        type: item.type,
        onProgress: (progress) => {
          item.progress = progress
        },
        signal: controller.signal,
      })
      if ('media' in result) {
        item.mediaId = result.media.id
        item.duplicate = result.media.label
      } else {
        item.upload = { type: item.type, fileId: result.fileId }
        const form = await adapter.getUploadForm({ upload: item.upload })
        if (!form) {
          throw new Error()
        }
        item.form = form
        for (const input of form.inputs) {
          if ('defaultValue' in input && input.defaultValue !== undefined) {
            item.values[input.name] = input.defaultValue
          }
        }
      }
      item.status = 'uploaded'
    } catch (e) {
      if (controller.signal.aborted) {
        return
      }
      item.status = 'failed'
      item.error = e instanceof Error && e.message ? e.message : null
    } finally {
      controllers.delete(controller)
      // After an abort, no other upload starts.
      if (!controller.signal.aborted) {
        start()
      }
    }
  }

  /**
   * Upload a file again, after it failed.
   */
  function retry(item: UploadItem) {
    item.status = 'queued'
    start()
  }

  /**
   * Leave a file out, e.g. one that can't be uploaded: no block is added for
   * it.
   */
  function remove(item: UploadItem) {
    const index = items.indexOf(item)
    if (index !== -1) {
      items.splice(index, 1)
    }
  }

  /**
   * Abort the running uploads; the queued ones aren't started.
   */
  function abort() {
    controllers.forEach((controller) => controller.abort())
  }

  /**
   * Create the media of the files that have none, through their forms. A media
   * isn't created twice: after errors, only the files that have none are sent
   * again.
   *
   * @returns Whether every file has its media.
   */
  async function createMedia(): Promise<boolean> {
    const pending = items.filter((item) => item.mediaId === null)
    if (pending.length) {
      const results = await adapter.createMediaFromUploads({
        items: pending.map((item) => ({
          upload: item.upload!,
          values: { ...item.values },
        })),
      })
      pending.forEach((item, i) => {
        const result = results[i]
        const names = item.form?.inputs.map((input) => input.name) ?? []
        item.mediaId = result?.mediaId ?? null
        item.errors = {}
        item.messages = []
        for (const error of result?.errors ?? []) {
          if (error.name && names.includes(error.name)) {
            item.errors[error.name] = error.message
          } else {
            item.messages.push(error.message)
          }
        }
      })
    }
    return items.every((item) => item.mediaId !== null)
  }

  return { items, isReady, start, retry, remove, abort, createMedia }
}
