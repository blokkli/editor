# getUploadForm

Get the form of the media created from an uploaded file.

## Signature

```typescript
getUploadForm?: (e: { upload: UploadedFile }) => Promise<UploadForm | null>
```

## Parameters

### upload

The file returned by [adapter.uploadFile].

```typescript
type UploadedFile = {
  type: 'image' | 'file'
  fileId: string
}
```

## Returns

```typescript
type UploadForm = {
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
The user can add the files once each required field has a value. When several
files have a field, its value can be applied to all of them.

An image's form can have a focal point, the point that crops keep: an input of
the type `focalPoint`, whose value is `"x,y"`, the point's offsets from the
image's left and top edges in whole percent. The dialog shows it on the image's
preview, where a click or a drag sets it. Its errors are shown below the form.

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
        {
          type: 'focalPoint',
          name: 'focal_point',
          label: 'Focal point',
          required: false,
          defaultValue: '50,50',
        },
      ],
      complete: true,
    }
  }
  return { inputs: [], complete: true }
}
```
