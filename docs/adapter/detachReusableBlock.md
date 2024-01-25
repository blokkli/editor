# detachReusableBlock()

Should detach one or more reusable blocks and add a copy of the blocks.

The method is called when a user clicks on the "Detach from Library" button on
one or more selected reusable blocks.

The return value should be the updated state where the reusable blocks have been
detached from their library items.

::: warning IMPORTANT

Because a reusable block can be used on multiple host entities, it should not be
deleted from the library when detaching. The specific implementation should
instead duplicate the reusable block and add a new block (with a new UUID) with
the same bundle and field values to the host entity.

:::

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import type { DetachReusableBlockEvent } from '#blokkli/types'

export default defineBlokkliEditAdapter<YourStateType>((ctx) => {
  return {
    detachReusableBlock: (e: DetachReusableBlockEvent) => {
      return $fetch(`/api/edit/${ctx.value.entityUuid}/detach-reusable`, {
        method: 'post',
        body: {
          // The UUIDs of the blocks that should be detached.
          // Note the UUID is the one from the "from_library" block bundle,
          // *NOT* the library item UUID or the block referenced in the
          // library item.
          uuids: e.uuid,
        },
      })
    },
  }
})
```

:::
