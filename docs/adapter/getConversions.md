# getConversions()

This method should return the possible block conversions. It's expected to
return an array of `ConversionItem` objects.

The editor uses this information to allow the users to convert one block bundle
to another. For this feature to work, the
[convertBlocks()](/adapter/convertBlocks) method must also be implemented.

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getConversions: () => {
      return Promise.resolve([
        {
          sourceBundle: 'title',
          targetBundle: 'text',
        },
        {
          sourceBundle: 'two_columns',
          targetBundle: 'grid',
        },
        {
          sourceBundle: 'link',
          targetBundle: 'text',
        },
      ])
    },
  }
})
```

:::
