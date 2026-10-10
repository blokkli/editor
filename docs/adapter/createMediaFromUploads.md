# createMediaFromUploads

Create the media of uploaded files, with the values of their forms.

## Signature

```typescript
createMediaFromUploads?: (e: {
  items: CreateMediaFromUploadsItem[]
}) => Promise<CreateMediaFromUploadsResult[]>
```

## Parameters

### items

The uploaded files, each with the values of its form's fields (see
[adapter.getUploadForm]).

```typescript
type CreateMediaFromUploadsItem = {
  upload: {
    type: 'image' | 'file'
    fileId: string
  }
  // The values of the form's fields, keyed by their names.
  values: Record<string, unknown>
}
```

## Returns

A result per item, in the same order.

```typescript
type CreateMediaFromUploadsResult = {
  // The ID of the media created, or null.
  mediaId: string | null
  // The errors, each with the name of its field, or null.
  errors: { name: string | null; message: string }[]
}
```

## Description

Called when the user adds the files. A file that exists as a media (see
[adapter.uploadFile]) isn't included.

An item whose media can't be created returns its errors: an error with the name
of a field shows at that field, the others below the form. The dialog stays
open, and the next time the user adds the files, only the items without a media
are sent again. So create each item's media on its own: an item's errors mustn't
prevent the others' media.

Once every file has its media, [adapter.addBlocksFromUploads] adds the blocks.

## Example

```typescript
createMediaFromUploads: ({ items }) =>
  $fetch('/backend-api/media/create-from-uploads', {
    method: 'post',
    body: {
      items: items.map((item) => ({
        fileId: item.upload.fileId,
        values: item.values,
      })),
    },
  })
```
