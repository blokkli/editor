# mediaLibraryReplaceEntityMedia

Replace media on a field of the page entity.

## Signature

```typescript
mediaLibraryReplaceEntityMedia?: (e: {
  host: DraggableHostData
  mediaId: string
}) => Promise<MutationResponseLike<T>> | undefined
```

## Parameters

### host

Information about the entity and field where the media was dropped.

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
drops it onto a `v-blokkli-droppable` element where the host is the page entity
(not a block). The adapter should replace the current media on the specified
entity field with the new media item.

This is typically used for operations like replacing the page's featured image
or hero image.

## Example

```typescript
mediaLibraryReplaceEntityMedia: async ({ host, mediaId }) => {
  const mutation = {
    type: 'replaceEntityMedia',
    entityUuid: host.uuid,
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
