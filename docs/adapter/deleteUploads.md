# deleteUploads

Delete uploaded files that get no media.

## Signature

```typescript
deleteUploads?: (e: { uploads: UploadedFile[] }) => Promise<void>
```

## Parameters

### uploads

The files returned by [adapter.uploadFile] that no media was created from.

```typescript
type UploadedFile = {
  type: 'image' | 'file'
  fileId: string
}
```

## Description

Called when the upload dialog is cancelled or closed, with the uploaded files
that have no media. It's also called for a file that is removed from the dialog
or uploaded again. The dialog doesn't wait for it, and ignores its errors.

Implement it if an upload is stored where the backend keeps its files, so that a
cancelled upload doesn't stay there. It's a courtesy, not a guarantee: a closed
tab calls nothing, so the backend should still clean up abandoned uploads
itself.

Only delete files the user uploaded and that have no media: the IDs come from
the browser.

## Example

```typescript
deleteUploads: async ({ uploads }) => {
  await $fetch('/backend-api/uploads', {
    method: 'DELETE',
    body: { fileIds: uploads.map((upload) => upload.fileId) },
  })
}
```
