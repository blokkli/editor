# uploadFile

Upload a pasted or dropped file, to create a media from it.

## Signature

```typescript
uploadFile?: (e: UploadFileEvent) => Promise<UploadFileResult>
```

## Parameters

### e

```typescript
type UploadFileEvent = {
  file: File
  // How the file is added: as an image or as a file.
  type: 'image' | 'file'
  // Called with the share of the file uploaded, from 0 to 1.
  onProgress: (progress: number) => void
  // Aborted when the user cancels the dialog.
  signal: AbortSignal
}
```

## Returns

```typescript
type UploadFileResult =
  | { fileId: string }
  | { media: { id: string; label: string } }
```

The uploaded file's ID, from which [adapter.createMediaFromUploads] creates a
media. If a media with the same file exists, return that media instead: it's
added as it is, without a form.

If the upload fails, reject with an error whose message says why: the dialog
shows it next to the file, and the user can try again or remove the file. An
error without a message gets a generic one. When the signal aborts, reject with
an `AbortError`.

## Description

With `uploadFile`, [adapter.getUploadForm], [adapter.createMediaFromUploads] and
[adapter.addBlocksFromUploads], pasted and dropped files are uploaded in a
dialog, where the user fills in their media's fields before the media are
created. Without all four, each file is read into memory and added with
[adapter.addBlockFromClipboardItem].

The dialog uploads two files at a time. `fetch` can't report an upload's
progress, `XMLHttpRequest` can.

## Example

```typescript
uploadFile: (e) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/backend-api/upload/${e.type}`)
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.setRequestHeader(
      'Content-Disposition',
      `file; filename="${encodeURIComponent(e.file.name)}"`,
    )
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        e.onProgress(event.loaded / event.total)
      }
    }
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText)
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data.media ? { media: data.media } : { fileId: data.fileId })
      } else {
        reject(new Error(data.message))
      }
    }
    xhr.onerror = () => reject(new Error())
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'))
    e.signal.addEventListener('abort', () => xhr.abort())
    xhr.send(e.file)
  })
```
