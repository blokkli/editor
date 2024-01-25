# addLibraryItem()

This method should add the given library item (reusable block) at the given
location.

The method is called when the user selects a reusable block from the sidebar.

The argument is an object of type `AddReusableItemEvent`. It contains a property
`libraryItemUuid`, which is the same UUID as the items returned by
[getLibraryItems()](/adapter/getLibraryItems).

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    addLibraryItem: (e) => {
      return $fetch(
        `/backend-api/edit/${ctx.value.entityUuid}/add-library-item`,
        {
          method: 'post',
          body: {
            // The UUID of the library item being added.
            uuid: e.libraryItemUuid,

            // The parent entity type where the block is being added.
            // Could be the entity type of the <BlokkliProvider> or in case
            // of nested blocks, the entity type of the block.
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
