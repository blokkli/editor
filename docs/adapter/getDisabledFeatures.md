# getDisablesFeatures()

This method is called to determine which features should be disabled at runtime.

You can use this to disable certain features based on the current context. For
example, disable the `comments` feature when editing product detail pages.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getDisablesFeatures: () => {
      if (ctx.value.entityType === 'product') {
        return Promise.resolve(['comments'])
      }

      return Promise.resolve([])
    },
  }
})
```

:::
