# addContentSearchItem()

This method should create a new block using the given content search item and
the given bundle.

The given item is of type `SearchContentItem` and is the same as the one
returned by [getContentSearchResults](/adapter/getContentSearchResults).

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import type {
  AddContentSearchItemEvent,
  SearchContentItem,
} from '#blokkli/types'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    addContentSearchItem: (e) => {
      // One of the items returned in getContentSearchResults().
      const item: SearchContentItem = e.item

      // The first matching bundle we defined in targetBundles of
      // our SearchContentItem.
      const bundle: string = e.bundle

      if (bundle === 'text') {
        return $fetch(
          `/backend-api/edit/${ctx.value.entityUuid}/add-text-block`,
          {
            method: 'post',
            body: {
              text: item.text,

              // The parent entity type where the block is being added.
              // Could be the entity type of the <BlokkliProvider> or in
              // case of nested blocks, the entity type of the block.
              entityType: e.host.type,
              entityUuid: e.host.uuid,

              // The field name where the block is added.
              fieldName: e.host.fieldName,

              // The UUID of the block that should be before the new one.
              preceedingUuid: e.afterUuid,
            },
          },
        )
      } else if (bundle === 'image') {
        return $fetch(
          `/backend-api/edit/${ctx.value.entityUuid}/add-image-block`,
          {
            method: 'post',
            body: {
              // Since we passed the image UUID in our SearchContentItem,
              // we can now use it to add an image block that references
              // this image.
              imageUuid: item.id,

              // The parent entity type where the block is being added.
              // Could be the entity type of the <BlokkliProvider> or in
              // case of nested blocks, the entity type of the block.
              entityType: e.host.type,
              entityUuid: e.host.uuid,

              // The field name where the block is added.
              fieldName: e.host.fieldName,

              // The UUID of the block that should be before the new one.
              preceedingUuid: e.afterUuid,
            },
          },
        )
      }
    },
  }
})
```

:::
