# moveBlock()

This method should move a single block to a new location.

The method is called when the user drag and drops an existing block.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    moveBlock: (e) => {
      return $fetch(`/backend-api/edit/${ctx.value.entityUuid}/move-block`, {
        method: 'post',
        body: {
          // The block being moved.
          uuid: e.item.uuid,

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
      })
    },
  }
})
```

:::
