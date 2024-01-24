# getContentSearchTabs()

This method should return an object that defines the available tabs in the
search feature. The keys of the object are used as identifiers when calling
[getContentSearchResults()](/adapter/getContentSearchResults) and the value is
used as the label in the UI.

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getContentSearchTabs: () => {
      return {
        images: 'Images',
        pages: 'Pages',
      }
    },
  }
})
```

:::
