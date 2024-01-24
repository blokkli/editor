# setHistoryIndex()

This method should update the current history index and then return the state
with all mutations applied up to (and including) the provided history index.

The method is called when the user triggers an undo or redo action, either by
clicking on the buttons or pressing (Shift) Ctrl/Cmd+Z or when clicking on a
specific history entry in the "History" sidebar pane.

The index can also be -1, which would mean to _not apply_ any mutations. This is
triggered when the current history index is `0` (and therefore the first
mutation is being applied) and the user performs an undo operation.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    setHistoryIndex: (index: number) => {
      return $fetch(
        `/backend-api/edit/${ctx.value.entityUuid}/set-history-index`,
        {
          method: 'post',
          body: {
            index,
          },
        },
      )
    },
  }
})
```

:::
