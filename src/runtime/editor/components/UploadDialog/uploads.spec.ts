import { describe, expect, test, vi } from 'vitest'
import type {
  UploadFileEvent,
  UploadFileResult,
  UploadForm,
} from '#blokkli/editor/types/uploads'
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

const altForm: UploadForm = {
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
function buildAdapter(form: UploadForm | null = altForm) {
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
    const form = deferred<UploadForm | null>()
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

  test('a removed file is left out', async () => {
    const { adapter, uploads } = buildAdapter()
    const state = createUploads(
      [buildFile('a.png'), buildFile('b.png')],
      adapter,
    )
    state.start()
    uploads[0]!.result.reject(new Error('The file is broken.'))
    uploads[1]!.result.resolve({ fileId: '2' })
    await flush()
    state.items[1]!.values.alt = 'A cat'
    expect(state.isReady.value).toBe(false)

    state.remove(state.items[0]!)
    expect(state.items.map((item) => item.file.name)).toEqual(['b.png'])
    expect(state.isReady.value).toBe(true)
  })

  test('without files, nothing can be added', async () => {
    const { adapter, uploads } = buildAdapter()
    const state = createUploads([buildFile('a.png')], adapter)
    state.start()
    uploads[0]!.result.reject(new Error())
    await flush()

    state.remove(state.items[0]!)
    expect(state.isReady.value).toBe(false)
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

  test('sends the focal point, whose error belongs to no field', async () => {
    const { adapter, uploads } = buildAdapter({
      inputs: [
        {
          type: 'focalPoint',
          name: 'focal_point',
          label: 'Focal point',
          required: false,
          defaultValue: '50,50',
        },
      ],
      complete: true,
    })
    const state = createUploads([buildFile('a.png')], adapter)
    state.start()
    uploads[0]!.result.resolve({ fileId: '1' })
    await flush()

    // Not required, and set to the image's centre.
    expect(state.isReady.value).toBe(true)
    state.items[0]!.values.focal_point = '25,75'
    const create = vi.mocked(adapter.createMediaFromUploads)
    create.mockResolvedValueOnce([
      {
        mediaId: null,
        errors: [{ name: 'focal_point', message: 'The focal point is wrong.' }],
      },
    ])
    await state.createMedia()
    expect(create).toHaveBeenLastCalledWith({
      items: [
        {
          upload: { type: 'image', fileId: '1' },
          values: { focal_point: '25,75' },
        },
      ],
    })
    expect(state.items[0]).toMatchObject({
      errors: {},
      messages: ['The focal point is wrong.'],
    })
  })

  test('a field shown while a checkbox is ticked is only required then', async () => {
    const condition = { name: 'licensed', value: true }
    const { adapter, uploads } = buildAdapter({
      inputs: [
        {
          type: 'checkbox',
          name: 'licensed',
          label: 'Licensed',
          required: false,
          defaultValue: false,
        },
        {
          type: 'text',
          name: 'licence',
          label: 'Licence',
          required: false,
          visibleIf: condition,
          requiredIf: condition,
        },
      ],
      complete: true,
    })
    const state = createUploads([buildFile('a.png')], adapter)
    state.start()
    uploads[0]!.result.resolve({ fileId: '1' })
    await flush()

    expect(state.isReady.value).toBe(true)
    state.items[0]!.values.licensed = true
    expect(state.isReady.value).toBe(false)
    state.items[0]!.values.licence = 'CC BY 4.0'
    expect(state.isReady.value).toBe(true)
  })

  test("a field's value is applied to the other files that have the field", async () => {
    const { adapter, uploads } = buildAdapter()
    // The third file's form has no credit.
    vi.mocked(adapter.getUploadForm)
      .mockResolvedValueOnce(altForm)
      .mockResolvedValueOnce(altForm)
      .mockResolvedValueOnce({
        inputs: [{ type: 'text', name: 'alt', label: 'Alt', required: true }],
        complete: true,
      })
    const state = createUploads(
      [
        buildFile('a.png'),
        buildFile('b.png'),
        buildFile('c.pdf', 'application/pdf'),
        buildFile('d.png'),
      ],
      adapter,
      4,
    )
    state.start()
    for (const id of ['1', '2', '3']) {
      uploads[Number(id) - 1]!.result.resolve({ fileId: id })
      await flush()
    }
    // An existing media has no fields to set.
    uploads[3]!.result.resolve({ media: { id: '5', label: 'Dog' } })
    await flush()

    const [first, , third] = state.items
    const getIds = (name: string) =>
      state.getSharedItems(first!, name).map((item) => item.id)
    expect(getIds('alt')).toEqual([1, 2])
    expect(getIds('credit')).toEqual([1])
    expect(getIds('other')).toEqual([])
    expect(state.getSharedItems(third!, 'alt').length).toBe(2)

    first!.values.credit = 'Jane Doe'
    state.applyToAll(first!, 'credit')
    expect(state.items.map((item) => item.values.credit)).toEqual([
      'Jane Doe',
      'Jane Doe',
      undefined,
      undefined,
    ])
  })

  test('abort deletes the uploaded files that have no media, once', async () => {
    const { adapter, uploads } = buildAdapter()
    adapter.deleteUploads = vi.fn(() => Promise.resolve())
    adapter.createMediaFromUploads = vi.fn(() =>
      Promise.resolve([
        { mediaId: '7', errors: [] },
        { mediaId: null, errors: [{ name: 'alt', message: 'Too short.' }] },
      ]),
    )
    const state = createUploads(
      [
        buildFile('a.png'),
        buildFile('b.png'),
        buildFile('c.png'),
        buildFile('d.png'),
      ],
      adapter,
      4,
    )
    state.start()
    uploads[0]!.result.resolve({ fileId: '1' })
    uploads[1]!.result.resolve({ fileId: '2' })
    // An existing media's file isn't an upload.
    uploads[2]!.result.resolve({ media: { id: '5', label: 'Dog' } })
    await flush()
    // The first file gets its media, the second doesn't.
    state.items[0]!.values.alt = 'A cat'
    state.items[1]!.values.alt = 'A'
    state.remove(state.items[3]!)
    await state.createMedia()

    state.abort()
    expect(adapter.deleteUploads).toHaveBeenCalledWith({
      uploads: [{ type: 'image', fileId: '2' }],
    })

    // As when the dialog is closed after it was cancelled.
    state.abort()
    expect(adapter.deleteUploads).toHaveBeenCalledTimes(1)
  })

  test('an adapter that deletes no uploads is not asked to', async () => {
    const { adapter, uploads } = buildAdapter()
    const state = createUploads([buildFile('a.png')], adapter)
    state.start()
    uploads[0]!.result.resolve({ fileId: '1' })
    await flush()

    expect(() => state.abort()).not.toThrow()
  })

  test('a file uploaded again, or removed, deletes its upload', async () => {
    const { adapter, uploads } = buildAdapter()
    adapter.deleteUploads = vi.fn(() => Promise.reject(new Error('Gone.')))
    // The first file's form can't be loaded.
    vi.mocked(adapter.getUploadForm).mockResolvedValueOnce(null)
    const state = createUploads(
      [buildFile('a.png'), buildFile('b.png')],
      adapter,
    )
    state.start()
    uploads[0]!.result.resolve({ fileId: '1' })
    uploads[1]!.result.resolve({ fileId: '2' })
    await flush()
    expect(state.items[0]!.status).toBe('failed')

    state.retry(state.items[0]!)
    expect(adapter.deleteUploads).toHaveBeenLastCalledWith({
      uploads: [{ type: 'image', fileId: '1' }],
    })
    uploads[2]!.result.resolve({ fileId: '3' })
    await flush()

    state.remove(state.items[1]!)
    expect(adapter.deleteUploads).toHaveBeenLastCalledWith({
      uploads: [{ type: 'image', fileId: '2' }],
    })
    expect(adapter.deleteUploads).toHaveBeenCalledTimes(2)
  })

  test('generates the alt text of a form that names its field', async () => {
    const { adapter, uploads } = buildAdapter()
    const text = deferred<string | null>()
    adapter.generateUploadAltText = vi.fn(() => text.promise)
    vi.mocked(adapter.getUploadForm)
      .mockResolvedValueOnce({ ...altForm, altTextInput: 'alt' })
      .mockResolvedValueOnce(altForm)
    const state = createUploads(
      [buildFile('a.png'), buildFile('b.png')],
      adapter,
    )
    state.start()
    uploads[0]!.result.resolve({ fileId: '1' })
    await flush()
    uploads[1]!.result.resolve({ fileId: '2' })
    await flush()
    const [first, second] = state.items

    expect(state.canGenerateAltText(first!)).toBe(true)
    // Its form names no field.
    expect(state.canGenerateAltText(second!)).toBe(false)
    expect(await state.generateAltText(second!)).toBe(false)

    const generated = state.generateAltText(first!)
    expect(first!.isGenerating).toBe(true)
    // Not twice at once.
    expect(await state.generateAltText(first!)).toBe(false)
    text.resolve('A cat on a sofa')
    expect(await generated).toBe(true)
    expect(adapter.generateUploadAltText).toHaveBeenCalledTimes(1)
    expect(adapter.generateUploadAltText).toHaveBeenCalledWith({
      upload: { type: 'image', fileId: '1' },
    })
    expect(first).toMatchObject({
      isGenerating: false,
      values: { alt: 'A cat on a sofa' },
    })
  })

  test('without an alt text, the field keeps its value', async () => {
    const { adapter, uploads } = buildAdapter({
      ...altForm,
      altTextInput: 'alt',
    })
    adapter.generateUploadAltText = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('No service.'))
    const state = createUploads([buildFile('a.png')], adapter)
    state.start()
    uploads[0]!.result.resolve({ fileId: '1' })
    await flush()
    const item = state.items[0]!
    item.values.alt = 'My own'

    expect(await state.generateAltText(item)).toBe(false)
    await expect(state.generateAltText(item)).rejects.toThrow('No service.')
    expect(item).toMatchObject({
      isGenerating: false,
      values: { alt: 'My own' },
    })
  })

  test('an adapter that generates no alt texts offers none', async () => {
    const { adapter, uploads } = buildAdapter({
      ...altForm,
      altTextInput: 'alt',
    })
    const state = createUploads([buildFile('a.png')], adapter)
    state.start()
    uploads[0]!.result.resolve({ fileId: '1' })
    await flush()

    expect(state.canGenerateAltText(state.items[0]!)).toBe(false)
  })
})
