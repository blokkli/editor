# makeBlockReusable()

Should make an existing block reusable.

The method is called when a user clicks on the "Library" button on a selected
block and subsequently clicks on Submit in the reusable dialog.

The user is required to provide a label for the reusable block.

The return value should be the updated state where the given block has been made
reusable.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import type { MakeReusableEvent } from '#blokkli/types'

export default defineBlokkliEditAdapter<YourStateType>((ctx) => {
  return {
    makeBlockReusable: (e: MakeReusableEvent) => {
      return $fetch(`/backend-api/edit/${ctx.value.entityUuid}/make-reusable`, {
        method: 'post',
        body: {
          // The UUID of the block that should be made reusable.
          uuid: e.uuid,

          // The label (entered by the user) to identify the reusable block in the library.
          label: e.label,
        },
      })
    },
  }
})
```

:::
