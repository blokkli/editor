# revertAllChanges()

This method should revert all changes made to the current host entity and delete
all previously added mutations.

The method is called when the user clicks on "Discard" in the menu and
subsequently confirms the action in the alert dialog.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    revertAllChanges: (e) => {
      return $fetch(
        `/backend-api/edit/${ctx.value.entityUuid}/revert-all-changes`,
        {
          method: 'post',
        },
      )
    },
  }
})
```

:::
