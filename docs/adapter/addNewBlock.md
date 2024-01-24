# addNewBlock()

This method should add a new block of the given bundle at the given location.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    addNewBlock: (e) => {
      return $fetch(`/backend-api/edit/${ctx.value.entityUuid}/add-new-block`, {
        method: 'post',
        body: {
          // The block bundle to add.
          bundle: e.type,

          // The parent entity type where the block is being added.
          // Could be the entity type of the <BlokkliProvider> or in case of nested blocks, the entity type of the block.
          entityType: e.host.type,
          entityUuid: e.host.uuid,

          // The field name where the block is added.
          fieldName: e.host.fieldName,

          // The UUID of the block that should be before the new one.
          preceedingUuid: e.afterUuid,
        },
      })
    },
  }
})
```

:::
