# publish()

This method should persist all changes made to the current host entity and
afterwards delete the edit state.

The method is called when the user clicks on "Publish" in the menu.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    publish: (e) => {
      return $fetch(`/backend-api/edit/${ctx.value.entityUuid}/publish`, {
        method: 'post',
      })
    },
  }
})
```

:::
