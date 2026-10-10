# addBlocksFromUploads

Add a block for each media created from an uploaded file.

## Signature

```typescript
addBlocksFromUploads?: (
  e: AddBlocksFromUploadsEvent,
) => Promise<MutationResponseLike<T>>
```

## Parameters

### e

```typescript
type AddBlocksFromUploadsEvent = {
  // The media, in the order the files were dropped, each with the bundle of
  // its block.
  items: { type: 'image' | 'file'; mediaId: string; bundle: string }[]
  // The host field where the blocks should be added.
  host: BlokkliItemHost
  // The UUID of the block after which the new blocks should be inserted, or
  // null to add them at the beginning of the field.
  afterUuid: string | null
}

type BlokkliItemHost = {
  type: string
  uuid: string
  fieldName: string
}
```

## Returns

A promise that resolves to a mutation response.

## Description

Called once [adapter.createMediaFromUploads] has created every file's media, or
[adapter.uploadFile] found an existing one. Files of several types can be
dropped together, such as an image and a PDF, each type with its own bundle.

Add all blocks with one mutation: the editor shows a loading state while it
runs, and the user undoes the drop in one step.

## Example

```typescript
addBlocksFromUploads: ({ items, host, afterUuid }) =>
  $fetch(`/backend-api/edit/${ctx.value.entityUuid}/add-media-blocks`, {
    method: 'post',
    body: {
      entityType: host.type,
      entityUuid: host.uuid,
      fieldName: host.fieldName,
      preceedingUuid: afterUuid,
      blocks: items.map((item) => ({
        bundle: item.bundle,
        mediaId: item.mediaId,
      })),
    },
  })
```
