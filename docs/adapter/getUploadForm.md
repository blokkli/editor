# getUploadForm

Get the form of the media created from an uploaded file.

## Signature

```typescript
getUploadForm?: (e: {
  upload: ClipboardUpload
}) => Promise<ClipboardUploadForm | null>
```

## Parameters

### upload

The file returned by [adapter.uploadFile].

```typescript
type ClipboardUpload = {
  type: 'image' | 'file'
  fileId: string
}
```

## Returns

```typescript
type ClipboardUploadForm = {
  // The form's fields.
  inputs: PluginConfigInput[]
  // Whether the fields are all the form needs.
  complete: boolean
}
```

Return `null` if the file is no longer available: the dialog shows the upload as
failed.

## Description

Called for each file once it's uploaded. The dialog shows the fields below the
file (text fields, checkboxes and options), filled with their default values.
The user can add the files once each required field has a value.

If `complete` is `false`, the media needs a field the dialog can't show, and no
media can be created from the file. The dialog says so.

The fields' names are the keys of the values that
[adapter.createMediaFromUploads] gets, and of the errors it returns.

## Example

```typescript
getUploadForm: async ({ upload }) => {
  if (upload.type === 'image') {
    return {
      inputs: [
        {
          type: 'text',
          name: 'alt',
          label: 'Alternative text',
          required: true,
        },
        {
          type: 'text',
          name: 'credit',
          label: 'Credit',
          required: false,
        },
      ],
      complete: true,
    }
  }
  return { inputs: [], complete: true }
}
```
