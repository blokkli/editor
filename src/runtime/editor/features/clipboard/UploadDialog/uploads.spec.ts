import { describe, expect, test, vi } from 'vitest'
import type {
  ClipboardUploadForm,
  UploadFileEvent,
  UploadFileResult,
} from '../types'
import { createUploads, type UploadMethods } from './uploads'

function buildFile(name: string, type = 'image/png'): File {
  return { name, type, size: 100 } as File
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

const altForm: ClipboardUploadForm = {
  inputs: [
    { type: 'text', name: 'alt', label: 'Alt', required: true },
    {
      type: 'text',
      name: 'credit',
      label: 'Credit',
      required: false,
      defaultValue: 'Unknown',
    },
  ],
  complete: true,
}

/**
 * An adapter whose uploads wait until the test settles them.
 */
function buildAdapter(form: ClipboardUploadForm | null = altForm) {
  const uploads: Array<{
    event: UploadFileEvent
    result: ReturnType<typeof deferred<UploadFileResult>>
  }> = []
  const adapter: UploadMethods = {
    uploadFile: (event) => {
      const result = deferred<UploadFileResult>()
      uploads.push({ event, result })
      return result.promise
    },
    getUploadForm: vi.fn(() => Promise.resolve(form)),
    createMediaFromUploads: vi.fn(() => Promise.resolve([])),
  }
  return { adapter, uploads }
}

describe('createUploads', () => {
  test('uploads two files at a time', async () => {
    const { adapter, uploads } = buildAdapter()
    const state = createUploads(
      [
        buildFile('a.png'),
        buildFile('b.png'),
        buildFile('c.pdf', 'application/pdf'),
      ],
      adapter,
    )
    state.start()
    expect(uploads.map((v) => v.event.file.name)).toEqual(['a.png', 'b.png'])

    uploads[0]!.result.resolve({ fileId: '1' })
    await flush()
    expect(uploads.map((v) => v.event.file.name)).toEqual([
      'a.png',
      'b.png',
      'c.pdf',
    ])
    expect(uploads[2]!.event.type).toBe('file')
  })

  test('reports the progress and loads the form, with its default values', async () => {
    const { adapter, uploads } = buildAdapter()
    const state = createUploads([buildFile('a.png')], adapter)
    state.start()

    uploads[0]!.event.onProgress(0.5)
    expect(state.items[0]!.progress).toBe(0.5)

    uploads[0]!.result.resolve({ fileId: '1' })
    await flush()
    expect(adapter.getUploadForm).toHaveBeenCalledWith({
      upload: { type: 'image', fileId: '1' },
    })
    expect(state.items[0]!.status).toBe('uploaded')
    expect(state.items[0]!.values).toEqual({ credit: 'Unknown' })
  })

  test('a file with an existing media has that media, without a form', async () => {
    const { adapter, uploads } = buildAdapter()
    const state = createUploads([buildFile('a.png')], adapter)
    state.start()

    uploads[0]!.result.resolve({ media: { id: '5', label: 'Cat' } })
    await flush()
    expect(state.items[0]).toMatchObject({
      status: 'uploaded',
      mediaId: '5',
      duplicate: 'Cat',
      form: null,
    })
    expect(adapter.getUploadForm).not.toHaveBeenCalled()
    expect(state.isReady.value).toBe(true)
  })

  test('a failed upload says why, and can be retried', async () => {
    const { adapter, uploads } = buildAdapter()
    const state = createUploads([buildFile('a.png')], adapter)
    state.start()

    uploads[0]!.result.reject(new Error('The file is too large.'))
    await flush()
    expect(state.items[0]).toMatchObject({
      status: 'failed',
      error: 'The file is too large.',
    })

    state.retry(state.items[0]!)
    expect(uploads).toHaveLength(2)
    uploads[1]!.result.resolve({ fileId: '2' })
    await flush()
    expect(state.items[0]!.status).toBe('uploaded')
  })

  test('a file without a form fails', async () => {
    const { adapter, uploads } = buildAdapter(null)
    const state = createUploads([buildFile('a.png')], adapter)
    state.start()

    uploads[0]!.result.resolve({ fileId: '1' })
    await flush()
    expect(state.items[0]).toMatchObject({ status: 'failed', error: null })
  })

  test('abort aborts the running uploads and starts no other', async () => {
    const { adapter, uploads } = buildAdapter()
    const state = createUploads(
      [buildFile('a.png'), buildFile('b.png'), buildFile('c.png')],
      adapter,
    )
    state.start()

    state.abort()
    expect(uploads.map((v) => v.event.signal.aborted)).toEqual([true, true])
    uploads[0]!.result.reject(new DOMException('Aborted', 'AbortError'))
    await flush()
    expect(uploads).toHaveLength(2)
    expect(state.items[0]!.status).toBe('uploading')
  })

  test('a form that loads after the abort starts no other upload', async () => {
    const { adapter, uploads } = buildAdapter()
    const form = deferred<ClipboardUploadForm | null>()
    adapter.getUploadForm = () => form.promise
    const state = createUploads(
      [buildFile('a.png'), buildFile('b.png'), buildFile('c.png')],
      adapter,
    )
    state.start()
    uploads[0]!.result.resolve({ fileId: '1' })
    await flush()

    state.abort()
    form.resolve(altForm)
    await flush()
    expect(uploads).toHaveLength(2)
  })

  test('the media can be created once the required fields are filled in', async () => {
    const { adapter, uploads } = buildAdapter()
    const state = createUploads([buildFile('a.png')], adapter)
    state.start()
    uploads[0]!.result.resolve({ fileId: '1' })
    await flush()

    expect(state.isReady.value).toBe(false)
    state.items[0]!.values.alt = 'A cat'
    expect(state.isReady.value).toBe(true)
  })

  test('no media can be created through an incomplete form', async () => {
    const { adapter, uploads } = buildAdapter({ ...altForm, complete: false })
    const state = createUploads([buildFile('a.png')], adapter)
    state.start()
    uploads[0]!.result.resolve({ fileId: '1' })
    await flush()

    state.items[0]!.values.alt = 'A cat'
    expect(state.isReady.value).toBe(false)
  })

  test('creates the media of the files without, once, with the errors at their fields', async () => {
    const { adapter, uploads } = buildAdapter()
    const state = createUploads(
      [buildFile('a.png'), buildFile('b.png'), buildFile('c.png')],
      adapter,
    )
    state.start()
    uploads[0]!.result.resolve({ media: { id: '5', label: 'Cat' } })
    uploads[1]!.result.resolve({ fileId: '1' })
    await flush()
    uploads[2]!.result.resolve({ fileId: '2' })
    await flush()

    const create = vi.mocked(adapter.createMediaFromUploads)
    create.mockResolvedValueOnce([
      { mediaId: '6', errors: [] },
      {
        mediaId: null,
        errors: [
          { name: 'alt', message: 'Alt is required.' },
          { name: null, message: 'The file is broken.' },
          { name: 'field_hidden', message: 'Hidden is required.' },
        ],
      },
    ])
    expect(await state.createMedia()).toBe(false)
    expect(create).toHaveBeenLastCalledWith({
      items: [
        {
          upload: { type: 'image', fileId: '1' },
          values: { credit: 'Unknown' },
        },
        {
          upload: { type: 'image', fileId: '2' },
          values: { credit: 'Unknown' },
        },
      ],
    })
    expect(state.items[2]).toMatchObject({
      mediaId: null,
      errors: { alt: 'Alt is required.' },
      messages: ['The file is broken.', 'Hidden is required.'],
    })

    // Only the file without its media is sent again.
    create.mockResolvedValueOnce([{ mediaId: '7', errors: [] }])
    expect(await state.createMedia()).toBe(true)
    expect(create).toHaveBeenLastCalledWith({
      items: [
        {
          upload: { type: 'image', fileId: '2' },
          values: { credit: 'Unknown' },
        },
      ],
    })
    expect(state.items.map((item) => item.mediaId)).toEqual(['5', '6', '7'])
    expect(state.items[2]!.errors).toEqual({})
  })
})
