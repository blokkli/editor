# mediaLibraryAddBlocks

Create multiple new blocks from media library items.

## Signature

```typescript
mediaLibraryAddBlocks?: (e: {
  host: DraggableHostData
  preceedingUuid?: string
  items: DraggableMediaLibraryItem[]
}) => Promise<MutationResponseLike<T>> | undefined
```

## Parameters

### host

Information about the host field where blocks should be added.

### preceedingUuid

Optional UUID of the block after which the new blocks should be inserted. If not
provided, blocks are added at the beginning of the field.

### items

An array of media library items to create blocks from.

```typescript
type DraggableMediaLibraryItem = {
  itemType: 'media_library'
  element: () => HTMLElement
  itemBundle: string
  mediaId: string
  mediaBundle: string
}
```

## Returns

A promise that resolves to a mutation response, or `undefined` if the operation
is not supported.

## Description

This method creates multiple blocks at once from an array of media library
items. This is more efficient than creating blocks one by one and allows for
batch operations when users select multiple items from the media library.

## Example

```typescript
mediaLibraryAddBlocks: async ({ host, preceedingUuid, items }) => {
  const mutations = items.map((item) => ({
    type: 'addBlock',
    bundle: item.itemBundle,
    host,
    afterUuid: preceedingUuid,
    mediaId: item.mediaId,
  }))

  const result = await applyMutations(mutations)

  return {
    success: true,
    state: result.state,
  }
}
```
