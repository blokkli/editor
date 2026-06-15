# mediaLibraryAddBlocks

Create multiple new blocks from media library items.

## Signature

```typescript
mediaLibraryAddBlocks?: (e: {
  host: BlokkliItemHost
  preceedingUuid: string | null
  targetBundle: string
  items: DraggableMediaLibraryItem[]
}) => Promise<MutationResponseLike<T>> | undefined
```

## Parameters

### host

Information about the host field where blocks should be added.

```typescript
type BlokkliItemHost = {
  type: string
  uuid: string
  fieldName: string
}
```

### preceedingUuid

UUID of the block after which the new blocks should be inserted, or `null` to
add them at the beginning of the field.

### targetBundle

The block bundle that should be created for the dropped media items.

### items

An array of media library items to create blocks from.

```typescript
type DraggableMediaLibraryItem = {
  itemType: 'media_library'
  element: () => HTMLElement
  itemBundles: string[]
  mediaId: string
  mediaBundle: string
  label: string
  thumbnailSrc?: string
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
mediaLibraryAddBlocks: async ({
  host,
  preceedingUuid,
  targetBundle,
  items,
}) => {
  const mutations = items.map((item) => ({
    type: 'addBlock',
    bundle: targetBundle,
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
