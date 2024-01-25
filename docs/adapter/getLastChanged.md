# getLastChanged()

This method should return the timestamp (as a Unix epoch timestamp in seconds)
of when the host entity has been last edited.

This method is called when the edit state is being previewed using the preview
URL. When the timestamp changes, the `<PreviewProvider>` will call the
[loadState()](/adapter/loadState) method to get the updated state.

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getLastChanged: () => {
      return Promise.resolve(
        // Timestamp of when the state was last edited (as seconds since UNIX epoch).
        1706109810,
      )
    },
  }
})
```

:::
