# getImportItems()

This method should return possible sources to import existing blocks into the
current page.

The method receives an `AdapterSearchArguments` object with `page` and `filters`
properties. It's expected to return an object with items, total count, page
size, and optionally filter definitions.

The method is called when the user opens the "Import from existing" dialog. It
receives the search arguments including the current page and any applied filters.

For this feature to work the [importFromExisting()](/adapter/importFromExisting)
method must also be implemented.

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getImportItems: (e) => {
      return Promise.resolve({
        total: 2,
        perPage: 16,
        filters: [],
        items: [
          {
            uuid: '1645ba79-8770-4a0c-a58b-163a847eea22',
            label: 'Example page 1',
          },
          {
            uuid: '27e417eb-a5fa-4d17-94b5-e218fc653906',
            label: 'Another example page',
          },
        ],
      })
    },
  }
})
```

:::
