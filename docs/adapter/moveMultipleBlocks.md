# moveMultipleBlocks()

This method should move one or more blocks to a new location.

The method is called when the user drag and drops one or more existing blocks.

::: warning IMPORTANT

The order of UUIDs is based on the order of when the blocks have been selected.
When moving multiple blocks, the UUIDs should be sorted before, so that the
order remains the same after moving.

:::

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    moveMultipleBlocks: (e) => {
      return $fetch(
        `/backend-api/edit/${ctx.value.entityUuid}/move-multiple-blocks`,
        {
          method: 'post',
          body: {
            // The UUIDs of the blocks being moved.
            uuids: e.uuids,

            // The parent entity type where the block is being added.
            // Could be the entity type of the <BlokkliProvider> or in case of nested blocks, the entity type of the block.
            entityType: e.host.type,
            entityUuid: e.host.uuid,

            // The field name where the block is added.
            fieldName: e.host.fieldName,

            // The UUID of the block that should be before the new one.
            // If undefined, the block should be moved to index 0 of the field list.
            preceedingUuid: e.afterUuid,
          },
        },
      )
    },
  }
})
```

:::
