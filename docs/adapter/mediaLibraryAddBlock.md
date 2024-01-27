# mediaLibraryAddBlock()

This method should add a new block for a media library item at the given
location.

The method is called when the user drag and drops a media library item provided
by [mediaLibraryGetResults()](/adapter/mediaLibraryGetResults) into the page.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import {
  defineBlokkliEditAdapter,
  type MediaLibraryAddBlockEvent,
} from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    mediaLibraryAddBlock: (e: MediaLibraryAddBlockEvent) => {
      return $fetch(
        `/backend-api/edit/${ctx.value.entityUuid}/create-media-block`,
        {
          method: 'post',
          body: {
            // The ID of the media library item, as returned by
            // mediaLibraryGetResults().
            mediaId: e.item.mediaId,
            blockBundle: e.item.blockBundle,

            // The parent entity type where the block is being added.
            // Could be the entity type of the <BlokkliProvider> or in
            // case of nested blocks, the entity type of the block.
            entityType: e.host.type,
            entityUuid: e.host.uuid,

            // The field name where the block is added.
            fieldName: e.host.fieldName,

            // The UUID of the block that should be before the new one.
            // If undefined, the block should be moved to index 0 of the
            // field list.
            preceedingUuid: e.afterUuid,
          },
        },
      )
    },
  }
})
```

:::
