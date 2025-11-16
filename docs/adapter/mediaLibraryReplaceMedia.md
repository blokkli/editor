# mediaLibraryReplaceMedia

Replace media on a block with a new media item.

## Signature

```typescript
mediaLibraryReplaceMedia?: (e: {
  host: DraggableHostData
  mediaId: string
}) => Promise<MutationResponseLike<T>> | undefined
```

## Parameters

### host

Information about the block and field where the media was dropped.

```typescript
type DraggableHostData = {
  type: string
  uuid: string
  fieldName: string
}
```

### mediaId

The ID of the media item from the media library.

## Returns

A promise that resolves to a mutation response, or `undefined` if the operation
is not supported.

## Description

This method is called when a user drags a media item from the media library and
drops it onto a `v-blokkli-droppable` element on a block. The adapter should
replace the current media on the specified field with the new media item.

This is typically used for operations like replacing an image in an image block.

## Example

```typescript
mediaLibraryReplaceMedia: async ({ host, mediaId }) => {
  const mutation = {
    type: 'replaceMedia',
    blockUuid: host.uuid,
    fieldName: host.fieldName,
    mediaId,
  }

  const result = await applyMutation(mutation)

  return {
    success: true,
    state: result.state,
  }
}
```
