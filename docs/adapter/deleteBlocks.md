# deleteBlocks()

This method should delete the blocks with the given UUIDs.

The method is called when the user clicks delete when one or more blocks are
selected.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    deleteBlocks: (uuids) => {
      return $fetch(`/api/edit/${ctx.value.entityUuid}/delete-blocks`, {
        method: 'post',
        body: {
          // The UUIDs of the blocks being deleted.
          uuids,
        },
      })
    },
  }
})
```

:::
