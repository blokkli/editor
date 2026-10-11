# getUploadMediaBundle

Get the bundle of the media created from a file, if the file can be uploaded.

## Signature

```typescript
getUploadMediaBundle?: (e: UploadFileInfo) => string | undefined | null
```

## Parameters

### e

What's known of the file.

```typescript
type UploadFileInfo = {
  // How the file is uploaded: as an image or as a file.
  type: 'image' | 'file'
  // The file's MIME type.
  fileType?: string
  // The file's size in bytes.
  fileSize?: number
  fileName?: string
}
```

A picked or dropped file has all of it. While a file is dragged in from the
operating system, browsers only tell its MIME type. With nothing but the `type`,
the editor asks whether such files can be uploaded at all.

## Returns

The bundle of the media, or nothing if the file can't be uploaded: its type or
size isn't accepted, or the user may not create the media. Check what's known
and skip the rest.

## Description

With `getUploadMediaBundle`, [adapter.uploadFile], [adapter.getUploadForm] and
[adapter.createMediaFromUploads], files are uploaded in a dialog without adding
blocks:

- The media library has an upload button, if images or files can be uploaded.
  The picked files' media are created, and the library is loaded again.
- A file dragged or pasted can be dropped on a block's media to replace it, when
  the field allows the file's media bundle. The media is then set with
  [adapter.mediaLibraryReplaceMedia] or
  [adapter.mediaLibraryReplaceEntityMedia].

A file the method refuses is named in a message, before anything is uploaded.

## Example

```typescript
getUploadMediaBundle: (e) => {
  if (e.type !== 'image') {
    return
  }
  if (e.fileSize && e.fileSize > 10 * 1024 * 1024) {
    return
  }
  return 'image'
}
```
