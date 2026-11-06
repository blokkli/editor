# mediaLibraryReplaceMedia

Replace media on a block with a new media item.

## Signature

```typescript
mediaLibraryReplaceMedia?: (e: {
  host: BlokkliItemHost
  mediaId: string
  allLanguages?: boolean
}) => Promise<MutationResponseLike<T>> | undefined
```

## Parameters

### host

Information about the block and field where the media was dropped.

```typescript
type BlokkliItemHost = {
  type: string
  uuid: string
  fieldName: string
}
```

### mediaId

The ID of the media item from the media library.

### allLanguages

Whether to replace the media in every translation of the block. Only set when
the field is translatable (`isTranslatable` in
[getDroppableFieldConfig](./getDroppableFieldConfig.md)) and the block has
another translation: the editor then asks. Otherwise the media changes in the
current language.

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
