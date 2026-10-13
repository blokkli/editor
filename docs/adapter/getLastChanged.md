# getLastChanged()

This method should return when the edit state was last changed, as an ISO 8601
date (e.g. `2026-05-28T14:32:18.000Z`).

This method is called when the edit state is being previewed using the preview
URL. When the date differs from the one before, the `<PreviewProvider>` will
call the [loadState()](/adapter/loadState) method to get the updated state.

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getLastChanged: () => {
      return Promise.resolve(
        // When the state was last changed, as an ISO 8601 date.
        '2024-01-24T15:23:30.000Z',
      )
    },
  }
})
```

:::
