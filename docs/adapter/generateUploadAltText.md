# generateUploadAltText

Generate the alt text of an uploaded image.

## Signature

```typescript
generateUploadAltText?: (e: { upload: UploadedFile }) => Promise<string | null>
```

## Parameters

### upload

The image returned by [adapter.uploadFile].

```typescript
type UploadedFile = {
  type: 'image' | 'file'
  fileId: string
}
```

## Returns

The alt text, in the language being edited, or `null` if none could be
generated.

## Description

The upload dialog shows a "Generate" button next to the field that
[adapter.getUploadForm] names as the form's `altTextInput`. A click calls this
method and puts the text into the field, replacing what's there. The user can
still change it: the media is created with the field's value, as with any other
field.

Without a text, or if the method rejects, the dialog says that no alt text could
be generated, and the field keeps its value.

The method is only called on request, never for every upload: a service that
describes images takes a moment and may charge for each image.

## Example

```typescript
generateUploadAltText: ({ upload }) =>
  $fetch<{ text: string | null }>('/backend-api/describe-image', {
    method: 'POST',
    body: { fileId: upload.fileId, language: 'en' },
  }).then((response) => response.text)
```
